import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 })
    }

    const { data: invoices, error } = await supabase
      .from("invoices")
      .select(
        `
        id,
        invoice_number,
        invoice_date,
        due_date,
        total_amount,
        currency,
        status,
        payment_proof_url,
        paid_at,
        subscription:organization_subscriptions(id)
      `,
      )
      .eq("organization_subscriptions.organization_id", profile.organization_id)
      .order("invoice_date", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching invoices:", error)
      return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 })
    }

    return NextResponse.json({ invoices })
  } catch (error) {
    console.error("[v0] Error in invoices route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
