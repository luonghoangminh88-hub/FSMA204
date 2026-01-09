import { NextResponse } from "next/server"
import { rateLimiter, getIdentifier, RateLimitConfig } from "./rate-limiter"

export { RateLimitConfig }
export const RATE_LIMITS = RateLimitConfig

/**
 * Middleware wrapper để thêm rate limiting vào API routes
 *
 * Usage:
 * export const POST = withRateLimit(
 *   async (request: Request) => { ... },
 *   RateLimitConfig.STRICT
 * )
 */

interface RateLimitOptions {
  limit: number
  windowMs: number
}

export function withRateLimit<T extends (...args: any[]) => Promise<Response>>(
  handler: T,
  options: RateLimitOptions = RateLimitConfig.STANDARD,
): T {
  return (async (...args: any[]) => {
    const request = args[0] as Request
    const identifier = getIdentifier(request)

    // Check rate limit
    const { success, remaining, resetTime } = rateLimiter.check(identifier, options.limit, options.windowMs)

    // Nếu vượt quá limit
    if (!success) {
      const resetDate = new Date(resetTime)
      return NextResponse.json(
        {
          error: "Quá nhiều yêu cầu. Vui lòng thử lại sau.",
          retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": options.limit.toString(),
            "X-RateLimit-Remaining": remaining.toString(),
            "X-RateLimit-Reset": resetDate.toISOString(),
            "Retry-After": Math.ceil((resetTime - Date.now()) / 1000).toString(),
          },
        },
      )
    }

    // Add rate limit headers to response
    const response = await handler(...args)

    response.headers.set("X-RateLimit-Limit", options.limit.toString())
    response.headers.set("X-RateLimit-Remaining", remaining.toString())
    response.headers.set("X-RateLimit-Reset", new Date(resetTime).toISOString())

    return response
  }) as T
}
