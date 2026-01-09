import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { handleError, AppError, ErrorCode } from "@/lib/security/error-handler"
import { createAuditLog, AuditAction, AuditSeverity, getRequestMetadata } from "@/lib/security/audit-logger"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      throw new AppError("Authentication required", ErrorCode.UNAUTHORIZED, 401)
    }

    const { data: profile } = await supabase.from("profiles").select("role, organization_id").eq("id", user.id).single()

    if (profile?.role !== "system_admin") {
      throw new AppError("System Admin access required", ErrorCode.FORBIDDEN, 403)
    }

    const body = await request.json()
    const { id } = await params

    // Get old package data for audit
    const { data: oldPackage } = await supabase.from("service_packages").select("*").eq("id", id).single()

    const { data: updatedPackage, error } = await supabase
      .from("service_packages")
      .update(body)
      .eq("id", id)
      .select()
      .single()

    if (error) throw error

    // Check if price changed for audit severity
    const priceChanged =
      oldPackage &&
      (oldPackage.price_monthly !== updatedPackage.price_monthly ||
        oldPackage.price_yearly !== updatedPackage.price_yearly)

    await createAuditLog({
      action: priceChanged ? AuditAction.PACKAGE_PRICE_CHANGE : AuditAction.PACKAGE_UPDATE,
      severity: priceChanged ? AuditSeverity.HIGH : AuditSeverity.MEDIUM,
      userId: user.id,
      tableName: "service_packages",
      recordId: id,
      oldData: oldPackage || undefined,
      newData: updatedPackage,
      ...getRequestMetadata(request),
    })

    return NextResponse.json({ package: updatedPackage })
  } catch (error: any) {
    return handleError(error, {
      endpoint: "/api/packages/[id]",
      method: "PATCH",
    })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      throw new AppError("Authentication required", ErrorCode.UNAUTHORIZED, 401)
    }

    const { data: profile } = await supabase.from("profiles").select("role, organization_id").eq("id", user.id).single()

    if (profile?.role !== "system_admin") {
      throw new AppError("System Admin access required", ErrorCode.FORBIDDEN, 403)
    }

    const { id } = await params

    // Get package data for audit
    const { data: packageData } = await supabase.from("service_packages").select("*").eq("id", id).single()

    const { error } = await supabase.from("service_packages").update({ is_active: false }).eq("id", id)

    if (error) throw error

    await createAuditLog({
      action: AuditAction.PACKAGE_DELETE,
      severity: AuditSeverity.HIGH,
      userId: user.id,
      tableName: "service_packages",
      recordId: id,
      oldData: packageData || undefined,
      ...getRequestMetadata(request),
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return handleError(error, {
      endpoint: "/api/packages/[id]",
      method: "DELETE",
    })
  }
}
