/**
 * Audit Logging System
 * Logs sensitive operations for compliance and security monitoring
 */

import { createClient } from "@/lib/supabase/server"

export enum AuditAction {
  // Authentication & Authorization
  LOGIN = "LOGIN",
  LOGOUT = "LOGOUT",
  LOGIN_FAILED = "LOGIN_FAILED",
  PASSWORD_CHANGE = "PASSWORD_CHANGE",
  ROLE_CHANGE = "ROLE_CHANGE",
  PERMISSION_CHANGE = "PERMISSION_CHANGE",

  // Organization Management
  ORG_CREATE = "ORG_CREATE",
  ORG_UPDATE = "ORG_UPDATE",
  ORG_DELETE = "ORG_DELETE",
  ORG_USER_ADD = "ORG_USER_ADD",
  ORG_USER_REMOVE = "ORG_USER_REMOVE",

  // Package & Subscription
  PACKAGE_CREATE = "PACKAGE_CREATE",
  PACKAGE_UPDATE = "PACKAGE_UPDATE",
  PACKAGE_DELETE = "PACKAGE_DELETE",
  PACKAGE_PRICE_CHANGE = "PACKAGE_PRICE_CHANGE",
  SUBSCRIPTION_CREATE = "SUBSCRIPTION_CREATE",
  SUBSCRIPTION_UPGRADE = "SUBSCRIPTION_UPGRADE",
  SUBSCRIPTION_DOWNGRADE = "SUBSCRIPTION_DOWNGRADE",
  SUBSCRIPTION_CANCEL = "SUBSCRIPTION_CANCEL",

  // Invoice & Payment
  INVOICE_CREATE = "INVOICE_CREATE",
  INVOICE_VERIFY = "INVOICE_VERIFY",
  INVOICE_REJECT = "INVOICE_REJECT",
  PAYMENT_PROOF_UPLOAD = "PAYMENT_PROOF_UPLOAD",

  // FDA & Compliance
  FDA_DATA_ACCESS = "FDA_DATA_ACCESS",
  FDA_REPORT_GENERATE = "FDA_REPORT_GENERATE",
  FDA_EXPORT_CREATE = "FDA_EXPORT_CREATE",
  VEXIM_AGENT_UPDATE = "VEXIM_AGENT_UPDATE",

  // Approvals
  APPROVAL_REQUEST = "APPROVAL_REQUEST",
  APPROVAL_APPROVE = "APPROVAL_APPROVE",
  APPROVAL_REJECT = "APPROVAL_REJECT",

  // Data Operations
  DATA_EXPORT = "DATA_EXPORT",
  DATA_IMPORT = "DATA_IMPORT",
  BULK_DELETE = "BULK_DELETE",
  BULK_UPDATE = "BULK_UPDATE",

  // Security Events
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
  UNAUTHORIZED_ACCESS = "UNAUTHORIZED_ACCESS",
  INVALID_TOKEN = "INVALID_TOKEN",
  FILE_UPLOAD_REJECTED = "FILE_UPLOAD_REJECTED",
}

export enum AuditSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

interface AuditLogData {
  action: AuditAction
  severity: AuditSeverity
  userId?: string
  organizationId?: string
  tableName?: string
  recordId?: string
  oldData?: Record<string, any>
  newData?: Record<string, any>
  metadata?: Record<string, any>
  ipAddress?: string
  userAgent?: string
}

/**
 * Creates an audit log entry
 */
export async function createAuditLog(data: AuditLogData): Promise<void> {
  try {
    const supabase = await createClient()

    await supabase.from("audit_log").insert({
      user_id: data.userId || null,
      organization_id: data.organizationId || null,
      table_name: data.tableName || null,
      record_id: data.recordId || null,
      action: data.action,
      severity: data.severity,
      old_data: data.oldData || null,
      new_data: data.newData || null,
      metadata: {
        ...data.metadata,
        ip_address: data.ipAddress,
        user_agent: data.userAgent,
        timestamp: new Date().toISOString(),
      },
    })

    // Also log critical events to console for immediate visibility
    if (data.severity === AuditSeverity.CRITICAL || data.severity === AuditSeverity.HIGH) {
      console.warn("[AUDIT LOG]", {
        action: data.action,
        severity: data.severity,
        userId: data.userId,
        organizationId: data.organizationId,
      })
    }
  } catch (error) {
    // Audit logging should never break the application
    // But we need to know if it fails
    console.error("[AUDIT LOG ERROR] Failed to create audit log:", error)
  }
}

/**
 * Gets client IP and User-Agent from request
 */
export function getRequestMetadata(request: Request): { ipAddress?: string; userAgent?: string } {
  return {
    ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined,
    userAgent: request.headers.get("user-agent") || undefined,
  }
}

/**
 * Wrapper to audit an operation
 */
export async function withAudit<T>(
  operation: () => Promise<T>,
  auditData: Omit<AuditLogData, "metadata"> & { metadata?: Record<string, any> },
  request?: Request,
): Promise<T> {
  const requestMetadata = request ? getRequestMetadata(request) : {}

  try {
    const result = await operation()

    // Log successful operation
    await createAuditLog({
      ...auditData,
      metadata: {
        ...auditData.metadata,
        ...requestMetadata,
        status: "success",
      },
    })

    return result
  } catch (error) {
    // Log failed operation
    await createAuditLog({
      ...auditData,
      severity: AuditSeverity.HIGH,
      metadata: {
        ...auditData.metadata,
        ...requestMetadata,
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      },
    })

    throw error
  }
}

export async function auditLog(data: {
  action: string
  resource_type: string
  resource_id: string | null
  user_id: string
  organization_id: string | null
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  metadata?: Record<string, any>
  request?: Request
}): Promise<void> {
  try {
    const supabase = await createClient()
    const requestMetadata = data.request ? getRequestMetadata(data.request) : {}

    await supabase.from("audit_log").insert({
      user_id: data.user_id,
      organization_id: data.organization_id,
      table_name: data.resource_type,
      record_id: data.resource_id,
      action: data.action,
      severity: data.severity.toLowerCase(),
      metadata: {
        ...data.metadata,
        ...requestMetadata,
        timestamp: new Date().toISOString(),
      },
    })

    if (data.severity === "CRITICAL" || data.severity === "HIGH") {
      console.warn("[AUDIT LOG]", {
        action: data.action,
        severity: data.severity,
        userId: data.user_id,
        organizationId: data.organization_id,
      })
    }
  } catch (error) {
    console.error("[AUDIT LOG ERROR] Failed to create audit log:", error)
  }
}
