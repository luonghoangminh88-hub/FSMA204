import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { withRateLimit, RateLimitConfig } from "@/lib/security/with-rate-limit"
import { validateFile, FileValidationPresets, generateSecureStoragePath } from "@/lib/security/file-validator"

export const POST = withRateLimit(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const supabase = await createClient()
  const { id: invoiceId } = await params

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File
    const transactionReference = formData.get("transactionReference") as string
    const paymentDate = formData.get("paymentDate") as string
    const payerName = formData.get("payerName") as string
    const bankName = formData.get("bankName") as string
    const notes = formData.get("notes") as string

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const validation = validateFile(file, {
      maxSizeBytes: FileValidationPresets.DOCUMENTS.maxSizeBytes,
      allowedTypes: [...FileValidationPresets.DOCUMENTS.allowedTypes],
      allowedExtensions: [...FileValidationPresets.DOCUMENTS.allowedExtensions],
    })

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    // Get user profile
    const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: "User not in organization" }, { status: 403 })
    }

    // Verify invoice belongs to user's organization
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("id, organization_id, invoice_number")
      .eq("id", invoiceId)
      .eq("organization_id", profile.organization_id)
      .single()

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    const fileName = generateSecureStoragePath(
      profile.organization_id,
      user.id,
      `payment-proofs/${invoiceId}`,
      validation.sanitizedFilename!,
    )

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage.from("invoices").upload(fileName, file)

    if (uploadError) {
      console.error("[v0] Error uploading file:", uploadError)
      return NextResponse.json({ error: "Failed to upload file" }, { status: 500 })
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from("invoices").getPublicUrl(fileName)

    // Create payment transaction record
    const { data: transaction, error: transactionError } = await supabase
      .from("payment_transactions")
      .insert({
        invoice_id: invoiceId,
        organization_id: profile.organization_id,
        transaction_reference: transactionReference,
        amount: 0, // Will be verified by admin
        payment_method: "bank_transfer",
        status: "pending",
        payment_date: paymentDate,
        payer_name: payerName,
        bank_name: bankName,
        proof_documents: [
          {
            url: urlData.publicUrl,
            filename: file.name,
            uploaded_at: new Date().toISOString(),
          },
        ],
        notes,
        created_by: user.id,
      })
      .select()
      .single()

    if (transactionError) {
      console.error("[v0] Error creating transaction:", transactionError)
      return NextResponse.json({ error: "Failed to create transaction" }, { status: 500 })
    }

    // Update invoice with payment proof URL
    await supabase
      .from("invoices")
      .update({
        payment_proof_url: urlData.publicUrl,
        payment_reference: transactionReference,
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoiceId)

    return NextResponse.json({ transaction })
  } catch (error: any) {
    console.error("[v0] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}, RateLimitConfig.UPLOAD)
