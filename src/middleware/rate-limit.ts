/**
 * Rate limiting middleware for Freeform
 * Uses KV for distributed rate limiting
 */

import type { Context, Next } from "hono";
import type { Env } from "../types/env.d";

// Rate limit configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute window
const DEFAULT_RATE_LIMIT = 10; // requests per window
const STRICT_RATE_LIMIT = 5; // for unverified forms

// KV key prefixes
const RATE_LIMIT_PREFIX = "rate:";

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  reset: number;
}

/**
 * Get rate limit key for an IP address
 */
function getRateLimitKey(ip: string, formId?: string): string {
  const suffix = formId ? `:${formId}` : "";
  return `${RATE_LIMIT_PREFIX}${ip}${suffix}`;
}

/**
 * Check and update rate limit for a request
 */
async function checkRateLimit(
  kv: KVNamespace,
  key: string,
  limit: number
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;

  // Get current count
  const data = await kv.get<{ count: number; window: number }>(key, "json");

  // If no data or window expired, start fresh
  if (!data || data.window < windowStart) {
    await kv.put(
      key,
      JSON.stringify({ count: 1, window: now }),
      { expirationTtl: 120 } // 2 minutes TTL
    );
    return {
      allowed: true,
      remaining: limit - 1,
      reset: now + RATE_LIMIT_WINDOW,
    };
  }

  // Check if over limit
  if (data.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      reset: data.window + RATE_LIMIT_WINDOW,
    };
  }

  // Increment count
  await kv.put(
    key,
    JSON.stringify({ count: data.count + 1, window: data.window }),
    { expirationTtl: 120 }
  );

  return {
    allowed: true,
    remaining: limit - data.count - 1,
    reset: data.window + RATE_LIMIT_WINDOW,
  };
}

/**
 * Rate limiting middleware factory
 */
export function rateLimitMiddleware(limit: number = DEFAULT_RATE_LIMIT) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    // Get client IP
    const ip =
      c.req.header("CF-Connecting-IP") ||
      c.req.header("X-Forwarded-For")?.split(",")[0]?.trim() ||
      "unknown";

    // Skip rate limiting for unknown IPs (shouldn't happen in production)
    if (ip === "unknown") {
      return next();
    }

    // Get form ID from request if available
    const formId = c.req.param("target");
    const key = getRateLimitKey(ip, formId);

    // Check rate limit
    const result = await checkRateLimit(c.env.KV, key, limit);

    // Set rate limit headers
    c.header("X-RateLimit-Limit", limit.toString());
    c.header("X-RateLimit-Remaining", result.remaining.toString());
    c.header("X-RateLimit-Reset", Math.floor(result.reset / 1000).toString());

    if (!result.allowed) {
      c.header("Retry-After", Math.ceil((result.reset - Date.now()) / 1000).toString());
      return c.json(
        {
          error: "rate_limit_exceeded",
          code: "RATE_LIMIT",
          message: "Too many requests. Please try again later.",
        },
        429
      );
    }

    return next();
  };
}

/**
 * Strict rate limit for unverified forms
 */
export const strictRateLimit = rateLimitMiddleware(STRICT_RATE_LIMIT);

/**
 * Standard rate limit
 */
export const standardRateLimit = rateLimitMiddleware(DEFAULT_RATE_LIMIT);

export { DEFAULT_RATE_LIMIT, STRICT_RATE_LIMIT, RATE_LIMIT_WINDOW };
