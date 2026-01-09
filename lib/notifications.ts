"use server"

import { createClient } from "@/lib/supabase/server"

export type NotificationType =
  | "fda_request_created"
  | "fda_request_approved"
  | "fda_request_rejected"
  | "lot_expiring_soon"
  | "lot_expired"
  | "compliance_alert"
  | "missing_tlc"
  | "incomplete_cte"
  | "user_assigned"
  | "role_changed"
  | "organization_updated"
  | "system_alert"

export type NotificationPriority = "low" | "normal" | "high" | "urgent"

interface CreateNotificationParams {
  userId: string
  organizationId?: string
  type: NotificationType
  title: string
  message: string
  link?: string
  data?: Record<string, any>
  priority?: NotificationPriority
}

export async function createNotification(params: CreateNotificationParams) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("notifications")
      .insert({
        user_id: params.userId,
        organization_id: params.organizationId || null,
        type: params.type,
        title: params.title,
        message: params.message,
        link: params.link || null,
        data: params.data || null,
        priority: params.priority || "normal",
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating notification:", error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    console.error("Error creating notification:", error)
    return { success: false, error: "Failed to create notification" }
  }
}

export async function createNotificationForOrgUsers(
  organizationId: string,
  type: NotificationType,
  title: string,
  message: string,
  link?: string,
  data?: Record<string, any>,
  priority?: NotificationPriority,
) {
  try {
    const supabase = await createClient()

    const { data: users } = await supabase.from("profiles").select("id").eq("organization_id", organizationId)

    if (!users || users.length === 0) {
      return { success: false, error: "No users found in organization" }
    }

    const notifications = users.map((user: { id: string }) => ({
      user_id: user.id,
      organization_id: organizationId,
      type,
      title,
      message,
      link: link || null,
      data: data || null,
      priority: priority || "normal",
    }))

    const { error } = await supabase.from("notifications").insert(notifications)

    if (error) {
      console.error("Error creating notifications for org:", error)
      return { success: false, error: error.message }
    }

    return { success: true, count: users.length }
  } catch (error) {
    console.error("Error creating notifications for org:", error)
    return { success: false, error: "Failed to create notifications" }
  }
}

export async function notifyFDARequestCreated(requestId: string, userId: string, organizationId: string) {
  await createNotification({
    userId,
    organizationId,
    type: "fda_request_created",
    title: "New FDA Request",
    message: "A new FDA traceability request has been logged and requires response within 24 hours.",
    link: `/dashboard/fda-requests`,
    data: { requestId },
    priority: "high",
  })
}

export async function notifyLotExpiring(
  lotCode: string,
  expirationDate: string,
  userId: string,
  organizationId: string,
) {
  await createNotification({
    userId,
    organizationId,
    type: "lot_expiring_soon",
    title: "Lot Expiring Soon",
    message: `Lot ${lotCode} will expire on ${expirationDate}. Please take appropriate action.`,
    link: `/dashboard/lots`,
    data: { lotCode, expirationDate },
    priority: "normal",
  })
}

export async function notifyUserRoleChanged(userId: string, newRole: string, changedBy: string) {
  await createNotification({
    userId,
    type: "role_changed",
    title: "Role Changed",
    message: `Your role has been changed to ${newRole}.`,
    link: `/dashboard/settings`,
    data: { newRole, changedBy },
    priority: "normal",
  })
}

export async function notifyOrganizationUpdated(organizationId: string, updateType: string) {
  await createNotificationForOrgUsers(
    organizationId,
    "organization_updated",
    "Organization Updated",
    `Your organization information has been updated: ${updateType}`,
    `/dashboard/organizations`,
    { updateType },
    "low",
  )
}
