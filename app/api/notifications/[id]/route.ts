import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { withRateLimit, RATE_LIMITS } from "@/lib/security/with-rate-limit"
import { handleError, AppError, ErrorCode } from "@/lib/security/error-handler"
import { z } from "zod"

export const dynamic = "force-dynamic"

const updateNotificationSchema = z
  .object({
    is_read: z.boolean(),
  })
  .strict()

export const PATCH = withRateLimit(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new AppError("Authentication required", ErrorCode.UNAUTHORIZED, 401)
    }

    const { id } = await params

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      throw new AppError("Invalid notification ID format", ErrorCode.VALIDATION_ERROR, 400)
    }

    const body = await req.json()
    const validated = updateNotificationSchema.parse(body)

    const { data, error } = await supabase
      .from("notifications")
      .update({
        is_read: validated.is_read,
        read_at: validated.is_read ? new Date().toISOString() : null,
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single()

    if (error) {
      throw new AppError("Failed to update notification", ErrorCode.DATABASE_ERROR, 500)
    }

    if (!data) {
      throw new AppError("Notification not found", ErrorCode.NOT_FOUND, 404)
    }

    return NextResponse.json({ notification: data })
  } catch (error) {
    return handleError(error, { endpoint: "update notification" })
  }
}, RATE_LIMITS.STANDARD)

export const DELETE = withRateLimit(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new AppError("Authentication required", ErrorCode.UNAUTHORIZED, 401)
    }

    const { id } = await params

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      throw new AppError("Invalid notification ID format", ErrorCode.VALIDATION_ERROR, 400)
    }

    const { error } = await supabase.from("notifications").delete().eq("id", id).eq("user_id", user.id)

    if (error) {
      throw new AppError("Failed to delete notification", ErrorCode.DATABASE_ERROR, 500)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleError(error, { endpoint: "delete notification" })
  }
}, RATE_LIMITS.STANDARD)
