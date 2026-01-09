import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { veximAgentSchema } from "@/lib/validation/schemas"
import { validateRequest, sanitizeError } from "@/lib/validation/validator"
import { withRateLimit, RateLimitConfig } from "@/lib/security/with-rate-limit"
import { createAuditLog, AuditAction, AuditSeverity, getRequestMetadata } from "@/lib/security/audit-logger"

export const GET = withRateLimit(async () => {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.from("vexim_us_agent").select("*").eq("is_active", true).maybeSingle()

    if (error) {
      console.error("[v0] Error fetching VEXIM agent:", error)
      return NextResponse.json({ error: sanitizeError(error) }, { status: 500 })
    }

    // Return null if no agent exists (not an error)
    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Error in GET /api/vexim/agent:", error)
    return NextResponse.json({ error: sanitizeError(error) }, { status: 500 })
  }
}, RateLimitConfig.RELAXED)

export const PATCH = withRateLimit(async (request: Request) => {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.log("[v0] No user found")
      return NextResponse.json({ error: "Unauthorized: Please log in" }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profileError) {
      console.error("[v0] Error fetching profile:", profileError)
      return NextResponse.json({ error: "Failed to verify permissions" }, { status: 500 })
    }

    if (profile?.role !== "system_admin") {
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 })
    }

    const body = await request.json()
    const validation = await validateRequest(veximAgentSchema, body)

    if (validation instanceof NextResponse) {
      return validation // Validation failed, return error response
    }

    const validatedData = validation.data!

    // Find the active VEXIM agent record
    const { data: existingAgent, error: fetchError } = await supabase
      .from("vexim_us_agent")
      .select("id")
      .eq("is_active", true)
      .maybeSingle()

    if (fetchError) {
      console.error("[v0] Error checking existing agent:", fetchError)
      return NextResponse.json({ error: sanitizeError(fetchError) }, { status: 500 })
    }

    let result
    if (existingAgent) {
      const { data, error } = await supabase
        .from("vexim_us_agent")
        .update({
          ...validatedData,
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        })
        .eq("id", existingAgent.id)
        .select()
        .single()

      if (error) {
        console.error("[v0] Error updating VEXIM agent:", error)
        return NextResponse.json({ error: sanitizeError(error) }, { status: 500 })
      }

      result = data
    } else {
      const { data, error } = await supabase
        .from("vexim_us_agent")
        .insert({
          ...validatedData,
          is_active: true,
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        })
        .select()
        .single()

      if (error) {
        console.error("[v0] Error creating VEXIM agent:", error)
        return NextResponse.json({ error: sanitizeError(error) }, { status: 500 })
      }

      result = data
    }

    await createAuditLog({
      action: AuditAction.VEXIM_AGENT_UPDATE,
      severity: AuditSeverity.CRITICAL,
      userId: user.id,
      tableName: "vexim_us_agent",
      recordId: result.id,
      newData: result,
      metadata: {
        operation: existingAgent ? "update" : "create",
      },
      ...getRequestMetadata(request),
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("[v0] Error in PATCH /api/vexim/agent:", error)
    return NextResponse.json({ error: sanitizeError(error) }, { status: 500 })
  }
}, RateLimitConfig.STANDARD)
