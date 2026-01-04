import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import type { Env } from "../types/env.d";
import { validateSession } from "../services/session";

const SESSION_COOKIE = "freeform_session";

/**
 * Middleware to protect dashboard API routes
 * Validates session token from HTTP-only cookie
 */
export async function dashboardAuthMiddleware(
  c: Context<{ Bindings: Env }>,
  next: Next
): Promise<Response | void> {
  const token = getCookie(c, SESSION_COOKIE);

  if (!token) {
    return c.json(
      {
        error: "unauthorized",
        code: "UNAUTHORIZED",
        message: "Authentication required",
      },
      401
    );
  }

  const session = await validateSession(c.env, token);

  if (!session) {
    return c.json(
      {
        error: "unauthorized",
        code: "SESSION_EXPIRED",
        message: "Session expired, please log in again",
      },
      401
    );
  }

  // Store session in context for downstream handlers
  c.set("dashboardSession", session);

  return next();
}

// Add session to context type
declare module "hono" {
  interface ContextVariableMap {
    dashboardSession: import("../types").DashboardSession;
  }
}
