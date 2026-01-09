import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { handleError, AppError, ErrorCode } from "@/lib/security/error-handler"
import { createAuditLog, AuditAction, AuditSeverity, getRequestMetadata } from "@/lib/security/audit-logger"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      throw new AppError("Authentication required", ErrorCode.UNAUTHORIZED, 401)
    }

    const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single()

    if (profile?.organization_id) {
      throw new AppError("User already has an organization", ErrorCode.ALREADY_EXISTS, 400)
    }

    const body = await request.json()

    if (!body.name || !body.name.trim()) {
      throw new AppError("Organization name is required", ErrorCode.MISSING_REQUIRED_FIELD, 400)
    }

    if (!body.organization_type) {
      throw new AppError("Organization type is required", ErrorCode.MISSING_REQUIRED_FIELD, 400)
    }

    if (!body.email || !body.email.trim()) {
      throw new AppError("Email is required", ErrorCode.MISSING_REQUIRED_FIELD, 400)
    }

    const serviceSupabase = await createClient()

    const { data: org, error: orgError } = await serviceSupabase
      .from("organizations")
      .insert({
        name: body.name.trim(),
        organization_type: body.organization_type,
        email: body.email.trim(),
        phone: body.phone || "",
        address: body.address || "",
        city: body.city || "",
        state: body.state || "",
        postal_code: body.postal_code || "",
        country: body.country || "USA",
        is_active: true,
      })
      .select()
      .single()

    if (orgError) {
      throw new AppError("Failed to create organization", ErrorCode.DATABASE_ERROR, 500)
    }

    const { error: profileError } = await serviceSupabase
      .from("profiles")
      .update({
        organization_id: org.id,
        role: "org_admin",
      })
      .eq("id", user.id)

    if (profileError) {
      throw new AppError("Organization created but failed to assign user", ErrorCode.DATABASE_ERROR, 500)
    }

    await createAuditLog({
      action: AuditAction.ORG_CREATE,
      severity: AuditSeverity.HIGH,
      userId: user.id,
      organizationId: org.id,
      tableName: "organizations",
      recordId: org.id,
      newData: org,
      ...getRequestMetadata(request),
    })

    return NextResponse.json({ data: org })
  } catch (error: any) {
    return handleError(error, {
      endpoint: "/api/organizations/create",
      method: "POST",
    })
  }
}
