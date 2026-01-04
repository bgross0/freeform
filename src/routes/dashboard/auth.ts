import { Hono } from "hono";
import { setCookie, getCookie, deleteCookie } from "hono/cookie";
import type { Env } from "../../types/env.d";
import {
  createSession,
  validateCredentials,
  validateSession,
  destroySession,
} from "../../services/session";

const authRouter = new Hono<{ Bindings: Env }>();

const SESSION_COOKIE = "freeform_session";
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "Strict" as const,
  path: "/dashboard",
  maxAge: 86400, // 24 hours
};

// POST /dashboard/api/auth/login
authRouter.post("/login", async (c) => {
  try {
    const body = await c.req.json();
    const { username, password } = body;

    if (!username || !password) {
      return c.json(
        {
          error: "invalid_request",
          code: "MISSING_CREDENTIALS",
          message: "Username and password are required",
        },
        400
      );
    }

    if (!validateCredentials(c.env, username, password)) {
      return c.json(
        {
          error: "unauthorized",
          code: "INVALID_CREDENTIALS",
          message: "Invalid username or password",
        },
        401
      );
    }

    // Create session (invalidates any existing session)
    const session = await createSession(c.env);

    // Set session cookie
    setCookie(c, SESSION_COOKIE, session.token, COOKIE_OPTIONS);

    return c.json({
      success: true,
      user: { id: "admin", username: "admin" },
      expiresAt: session.expiresAt,
    });
  } catch (error) {
    console.error("Login error:", error);
    return c.json(
      {
        error: "server_error",
        code: "LOGIN_FAILED",
        message: "Login failed",
      },
      500
    );
  }
});

// POST /dashboard/api/auth/logout
authRouter.post("/logout", async (c) => {
  const token = getCookie(c, SESSION_COOKIE);

  if (token) {
    await destroySession(c.env, token);
  }

  deleteCookie(c, SESSION_COOKIE, { path: "/dashboard" });

  return c.json({ success: true });
});

// GET /dashboard/api/auth/me
authRouter.get("/me", async (c) => {
  const token = getCookie(c, SESSION_COOKIE);

  if (!token) {
    return c.json(
      {
        error: "unauthorized",
        code: "NOT_AUTHENTICATED",
        message: "Not authenticated",
      },
      401
    );
  }

  const session = await validateSession(c.env, token);

  if (!session) {
    deleteCookie(c, SESSION_COOKIE, { path: "/dashboard" });
    return c.json(
      {
        error: "unauthorized",
        code: "SESSION_EXPIRED",
        message: "Session expired",
      },
      401
    );
  }

  return c.json({
    user: { id: "admin", username: "admin" },
    expiresAt: session.expiresAt,
  });
});

export { authRouter };
