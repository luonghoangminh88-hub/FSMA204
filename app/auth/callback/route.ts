import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { withRateLimit, RATE_LIMITS } from "@/lib/security/with-rate-limit"
import { AppError, ErrorCode } from "@/lib/security/error-handler"

export const GET = withRateLimit(async (request: NextRequest) => {
  try {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get("code")
    const next = searchParams.get("next") ?? "/auth/setup-password"

    if (!code) {
      throw new AppError("Authorization code is missing", ErrorCode.VALIDATION_ERROR, 400)
    }

    // Sanitize next parameter to prevent open redirect
    const allowedPaths = ["/auth/setup-password", "/auth/onboarding", "/dashboard"]
    const sanitizedNext = allowedPaths.includes(next) ? next : "/auth/setup-password"

    const supabase = await createClient()

    // Exchange the code for a session
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error("[v0] Auth callback error:", error)
      throw new AppError("Failed to exchange code for session", ErrorCode.INVALID_TOKEN, 401)
    }

    // Redirect to setup password page
    const forwardedHost = request.headers.get("x-forwarded-host")
    const isLocalEnv = process.env.NODE_ENV === "development"

    if (isLocalEnv) {
      return NextResponse.redirect(`${origin}${sanitizedNext}`)
    } else if (forwardedHost) {
      return NextResponse.redirect(`https://${forwardedHost}${sanitizedNext}`)
    } else {
      return NextResponse.redirect(`${origin}${sanitizedNext}`)
    }
  } catch (error) {
    const { origin } = new URL(request.url)
    console.error("[v0] Auth callback failed:", error)
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
  }
}, RATE_LIMITS.STRICT)
