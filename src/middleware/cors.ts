/**
 * CORS middleware for Freeform
 * Allows cross-origin form submissions from any domain
 */

import type { Context, Next } from "hono";
import type { Env } from "../types/env.d";

/**
 * CORS preflight handler for OPTIONS requests
 */
export async function corsMiddleware(
  c: Context<{ Bindings: Env }>,
  next: Next
) {
  // Get origin from request
  const origin = c.req.header("Origin") || "*";

  // Handle preflight OPTIONS request
  if (c.req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers":
          "Content-Type, X-API-Key, X-Requested-With, Accept",
        "Access-Control-Expose-Headers":
          "X-RateLimit-Limit, X-RateLimit-Remaining, Retry-After",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // Add CORS headers before proceeding
  c.header("Access-Control-Allow-Origin", origin);
  c.header("Access-Control-Allow-Credentials", "true");

  // Continue to next handler
  return next();
}

/**
 * Validate origin against allowed list
 * Returns true if origin is allowed, false otherwise
 */
export function isOriginAllowed(
  origin: string | undefined,
  allowedOrigins: string[]
): boolean {
  // If no origin or wildcard, allow
  if (!origin || allowedOrigins.includes("*")) {
    return true;
  }

  // Check exact match
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  // Check pattern match (e.g., *.example.com)
  for (const allowed of allowedOrigins) {
    if (allowed.startsWith("*.")) {
      const domain = allowed.slice(2);
      try {
        const originUrl = new URL(origin);
        if (
          originUrl.hostname === domain ||
          originUrl.hostname.endsWith(`.${domain}`)
        ) {
          return true;
        }
      } catch {
        // Invalid URL, skip
      }
    }
  }

  return false;
}
