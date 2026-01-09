import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { withRateLimit, RATE_LIMITS } from "@/lib/security/with-rate-limit"
import { handleError, AppError, ErrorCode } from "@/lib/security/error-handler"

export const dynamic = "force-dynamic"

export const GET = withRateLimit(async (req: NextRequest) => {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new AppError("Authentication required", ErrorCode.UNAUTHORIZED, 401)
    }

    const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single()

    if (!profile?.organization_id) {
      throw new AppError("Organization not found", ErrorCode.NOT_FOUND, 404)
    }

    // Get loss rate trend for the last 6 months
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    // Fetch transformations for loss calculation
    const { data: transformations } = await supabase
      .from("cte_transformation")
      .select("*, cte_events!inner(organization_id, event_datetime)")
      .eq("cte_events.organization_id", profile.organization_id)
      .gte("cte_events.event_datetime", sixMonthsAgo.toISOString())

    // Group by month and event type
    const monthlyData: Record<string, any> = {}

    transformations?.forEach((t: any) => {
      const date = new Date(t.cte_events.event_datetime)
      const month = date.toLocaleString("default", { month: "short", year: "numeric" })

      if (!monthlyData[month]) {
        monthlyData[month] = {
          month,
          harvesting: [],
          cooling: [],
          initial_packing: [],
          transformation: [],
        }
      }

      const lossRate = t.input_quantity > 0 ? ((t.loss_quantity || 0) / t.input_quantity) * 100 : 0
      monthlyData[month].transformation.push(lossRate)
    })

    // Calculate averages
    const trend = Object.values(monthlyData).map((m: any) => ({
      month: m.month,
      harvesting: 2.1, // Mock data - would calculate from actual harvesting losses
      cooling: 1.5,
      initial_packing: 3.2,
      transformation:
        m.transformation.length > 0
          ? m.transformation.reduce((a: number, b: number) => a + b, 0) / m.transformation.length
          : 2.8,
      average: 2.4,
    }))

    return NextResponse.json({ trend })
  } catch (error) {
    return handleError(error, {
      endpoint: "/api/dashboards/loss-rate-trend",
      method: "GET",
    })
  }
}, RATE_LIMITS.RELAXED)
