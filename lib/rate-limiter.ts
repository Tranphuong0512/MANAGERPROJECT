import { NextRequest, NextResponse } from 'next/server'

interface RateLimitRecord {
  count: number
  resetTime: number
}

interface RateLimitOptions {
  /** Maximum number of allowed requests within the time window */
  maxRequests?: number
  /** Time window in milliseconds (default: 60,000ms = 1 minute) */
  windowMs?: number
  /** Custom key prefix for distinguishing endpoints */
  prefix?: string
}

// In-memory token/sliding store with automatic capacity management
const rateLimitStore = new Map<string, RateLimitRecord>()
const MAX_RATE_LIMIT_ENTRIES = 5000

function cleanupExpiredEntries() {
  const now = Date.now()
  for (const [key, record] of rateLimitStore.entries()) {
    if (now >= record.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}

// Run cleanup periodically every 2 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredEntries, 120_000).unref?.()
}

/**
 * Extracts a unique client identifier from request headers (IP / Forwarded / User).
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp.trim()
  }
  return '127.0.0.1'
}

/**
 * Checks if a request exceeds rate limits.
 * Returns { allowed: true } or a 429 Too Many Requests response.
 */
export function checkRateLimit(
  request: NextRequest,
  options: RateLimitOptions = {}
): { allowed: true; remaining: number; reset: number } | { allowed: false; response: NextResponse } {
  const maxRequests = options.maxRequests ?? 60
  const windowMs = options.windowMs ?? 60_000
  const prefix = options.prefix ?? 'global'

  const ip = getClientIp(request)
  const apiKey = request.headers.get('x-api-key') || ''
  const identifier = apiKey ? `key:${apiKey.slice(0, 8)}` : `ip:${ip}`
  const key = `${prefix}:${identifier}`

  const now = Date.now()

  // Prevent memory explosion if attacked by high cardinality IPs
  if (rateLimitStore.size > MAX_RATE_LIMIT_ENTRIES) {
    cleanupExpiredEntries()
  }

  let record = rateLimitStore.get(key)

  if (!record || now >= record.resetTime) {
    record = {
      count: 1,
      resetTime: now + windowMs,
    }
    rateLimitStore.set(key, record)

    return {
      allowed: true,
      remaining: maxRequests - 1,
      reset: record.resetTime,
    }
  }

  record.count++

  if (record.count > maxRequests) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000)
    const response = NextResponse.json(
      {
        error: 'Too Many Requests',
        message: `Đã vượt quá giới hạn yêu cầu (${maxRequests} req / ${windowMs / 1000}s). Vui lòng thử lại sau ${retryAfter} giây.`,
        retryAfter,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(record.resetTime / 1000)),
        },
      }
    )

    return {
      allowed: false,
      response,
    }
  }

  return {
    allowed: true,
    remaining: maxRequests - record.count,
    reset: record.resetTime,
  }
}
