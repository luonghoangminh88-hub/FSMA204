import { createClient } from "@/lib/supabase/server"

interface CreateNotificationParams {
  userId: string
  organizationId: string
  type: string
  title: string
  message: string
  link?: string
  priority?: "normal" | "high" | "urgent"
}

export async function createNotification({
  userId,
  organizationId,
  type,
  title,
  message,
  link,
  priority = "normal",
}: CreateNotificationParams) {
  try {
    const supabase = await createClient()

    const { error } = await supabase.from("notifications").insert({
      user_id: userId,
      organization_id: organizationId,
      type,
      title,
      message,
      link: link || null,
      priority,
      is_read: false,
    })

    if (error) {
      console.error("[v0] Error creating notification:", error)
      return { success: false, error }
    }

    return { success: true }
  } catch (error) {
    console.error("[v0] Exception creating notification:", error)
    return { success: false, error }
  }
}
