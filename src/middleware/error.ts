/**
 * Error handling middleware for Freeform
 * Catches and formats all errors consistently
 */

import type { Context, Next } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { Env } from "../types/env.d";
import { jsonError, errorPage, htmlResponse } from "../utils/response";

/**
 * Custom error classes for specific error types
 */
export class FreeformError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number = 400
  ) {
    super(message);
    this.name = "FreeformError";
  }
}

export class ValidationError extends FreeformError {
  constructor(message: string) {
    super("VALIDATION_ERROR", message, 400);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends FreeformError {
  constructor(resource: string = "Resource") {
    super("NOT_FOUND", `${resource} not found`, 404);
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends FreeformError {
  constructor(message: string = "Authentication required") {
    super("UNAUTHORIZED", message, 401);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends FreeformError {
  constructor(message: string = "Access denied") {
    super("FORBIDDEN", message, 403);
    this.name = "ForbiddenError";
  }
}

export class RateLimitError extends FreeformError {
  constructor(
    public retryAfter: number = 60
  ) {
    super("RATE_LIMITED", "Too many requests, please try again later", 429);
    this.name = "RateLimitError";
  }
}

export class SpamError extends FreeformError {
  constructor(message: string = "Submission blocked as spam") {
    super("SPAM_BLOCKED", message, 403);
    this.name = "SpamError";
  }
}

/**
 * Global error handling middleware
 */
export async function errorMiddleware(
  c: Context<{ Bindings: Env }>,
  next: Next
): Promise<Response | void> {
  try {
    return await next();
  } catch (error) {
    console.error("Error:", error);

    // Check if client expects HTML (form submission) or JSON (API)
    const acceptsHtml =
      c.req.header("Accept")?.includes("text/html") &&
      !c.req.header("Accept")?.includes("application/json");

    // Handle known error types
    if (error instanceof FreeformError) {
      // Add rate limit headers if applicable
      if (error instanceof RateLimitError) {
        c.header("Retry-After", String(error.retryAfter));
      }

      if (acceptsHtml) {
        return htmlResponse(
          c,
          errorPage(getErrorTitle(error.code), error.message),
          error.status as ContentfulStatusCode
        );
      }

      return jsonError(
        c,
        error.code.toLowerCase(),
        error.code,
        error.message,
        error.status as ContentfulStatusCode
      );
    }

    // Handle unknown errors
    const isDev = c.env.ENVIRONMENT === "development";
    const message = isDev && error instanceof Error ? error.message : "An unexpected error occurred";

    if (acceptsHtml) {
      return htmlResponse(c, errorPage("Server Error", message), 500);
    }

    return jsonError(c, "internal_error", "INTERNAL_ERROR", message, 500);
  }
}

/**
 * Get user-friendly error title from code
 */
function getErrorTitle(code: string): string {
  const titles: Record<string, string> = {
    VALIDATION_ERROR: "Invalid Input",
    NOT_FOUND: "Not Found",
    UNAUTHORIZED: "Unauthorized",
    FORBIDDEN: "Access Denied",
    RATE_LIMITED: "Too Many Requests",
    SPAM_BLOCKED: "Blocked",
    INTERNAL_ERROR: "Server Error",
  };
  return titles[code] || "Error";
}
