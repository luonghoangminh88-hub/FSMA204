import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { createPackageSchema } from "@/lib/validation/schemas"
import { validateRequest, sanitizeError } from "@/lib/validation/validator"
import { withRateLimit, RateLimitConfig } from "@/lib/security/with-rate-limit"

export const GET = withRateLimit(async () => {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    // If user is authenticated and is system_admin, show all packages
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

      if (profile?.role === "system_admin") {
        const { data: packages, error } = await supabase
          .from("service_packages")
          .select(
            `
            *,
            features:package_features(*)
          `,
          )
          .order("display_order", { ascending: true })

        if (error) throw error

        return NextResponse.json({ packages })
      }
    }

    const { data: packages, error } = await supabase
      .from("service_packages")
      .select(
        `
        *,
        features:package_features(*)
      `,
      )
      .eq("is_active", true)
      .eq("is_public", true)
      .order("display_order", { ascending: true })

    if (error) throw error

    return NextResponse.json({ packages })
  } catch (error: any) {
    console.error("[v0] Error fetching packages:", error)
    return NextResponse.json({ error: sanitizeError(error) }, { status: 500 })
  }
}, RateLimitConfig.RELAXED)

export const POST = withRateLimit(async (request: Request) => {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is system admin
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (profile?.role !== "system_admin") {
      return NextResponse.json({ error: "Forbidden - System Admin only" }, { status: 403 })
    }

    const body = await request.json()
    const validation = await validateRequest(createPackageSchema, body)

    if (validation instanceof NextResponse) {
      return validation // Validation failed, return error response
    }

    const validatedData = validation.data!

    // Create package
    const { data: newPackage, error } = await supabase
      .from("service_packages")
      .insert([validatedData])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ package: newPackage }, { status: 201 })
  } catch (error: any) {
    console.error("[v0] Error creating package:", error)
    return NextResponse.json({ error: sanitizeError(error) }, { status: 500 })
  }
}, RateLimitConfig.STANDARD)
