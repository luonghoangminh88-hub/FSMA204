/**
 * In-memory Rate Limiter
 * Giới hạn số lượng requests từ một IP/identifier trong một khoảng thời gian
 *
 * Sử dụng Map để lưu trữ và tự động cleanup sau mỗi lần check
 * Phù hợp cho development và small-scale production
 *
 * Để scale lớn hơn, nên chuyển sang Redis (Upstash)
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

class RateLimiter {
  private storage: Map<string, RateLimitEntry> = new Map()
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    // Cleanup mỗi 5 phút để tránh memory leak
    this.cleanupInterval = setInterval(
      () => {
        this.cleanup()
      },
      5 * 60 * 1000,
    )
  }

  private cleanup() {
    const now = Date.now()
    for (const [key, entry] of this.storage.entries()) {
      if (now > entry.resetTime) {
        this.storage.delete(key)
      }
    }
  }

  /**
   * Check và increment rate limit
   * @param identifier - IP address hoặc user ID
   * @param limit - Số requests tối đa
   * @param windowMs - Thời gian window (milliseconds)
   * @returns { success: boolean, remaining: number, resetTime: number }
   */
  check(
    identifier: string,
    limit: number,
    windowMs: number,
  ): { success: boolean; remaining: number; resetTime: number } {
    const now = Date.now()
    const entry = this.storage.get(identifier)

    // Nếu không có entry hoặc đã hết thời gian reset
    if (!entry || now > entry.resetTime) {
      const resetTime = now + windowMs
      this.storage.set(identifier, { count: 1, resetTime })
      return { success: true, remaining: limit - 1, resetTime }
    }

    // Nếu đã vượt quá limit
    if (entry.count >= limit) {
      return { success: false, remaining: 0, resetTime: entry.resetTime }
    }

    // Increment count
    entry.count++
    this.storage.set(identifier, entry)
    return { success: true, remaining: limit - entry.count, resetTime: entry.resetTime }
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    this.storage.clear()
  }
}

// Singleton instance
const rateLimiter = new RateLimiter()

// Export các preset configs cho các use cases khác nhau
export const RateLimitConfig = {
  // Strict: cho authentication endpoints (login, signup)
  STRICT: { limit: 5, windowMs: 15 * 60 * 1000 }, // 5 requests per 15 phút

  // Standard: cho các API routes thông thường
  STANDARD: { limit: 60, windowMs: 60 * 1000 }, // 60 requests per phút

  // Relaxed: cho các read-only endpoints
  RELAXED: { limit: 120, windowMs: 60 * 1000 }, // 120 requests per phút

  // Upload: cho file uploads
  UPLOAD: { limit: 10, windowMs: 60 * 1000 }, // 10 uploads per phút
}

export { rateLimiter }

/**
 * Helper function để lấy identifier từ request
 */
export function getIdentifier(request: Request): string {
  // Ưu tiên IP từ headers
  const forwardedFor = request.headers.get("x-forwarded-for")
  const realIp = request.headers.get("x-real-ip")

  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim()
  }

  if (realIp) {
    return realIp
  }

  // Fallback
  return "unknown"
}
