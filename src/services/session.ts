import type { Env } from "../types/env.d";
import type { DashboardSession } from "../types";

const SESSION_PREFIX = "dashboard_session:";
const USER_SESSION_KEY = "dashboard_user_session:admin"; // For single-session enforcement
const SESSION_TTL = 86400; // 24 hours in seconds

/**
 * Generate a cryptographically secure session token
 */
function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Create a new dashboard session
 * Invalidates any existing session for single-session enforcement
 */
export async function createSession(env: Env): Promise<DashboardSession> {
  // Invalidate any existing session (single-session enforcement)
  await invalidateUserSession(env);

  const token = generateToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL * 1000);

  const session: DashboardSession = {
    token,
    userId: "admin",
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  // Store session by token
  await env.KV.put(SESSION_PREFIX + token, JSON.stringify(session), {
    expirationTtl: SESSION_TTL,
  });

  // Store reference to current user session for single-session enforcement
  await env.KV.put(USER_SESSION_KEY, token, {
    expirationTtl: SESSION_TTL,
  });

  return session;
}

/**
 * Validate a session token and return session data if valid
 */
export async function validateSession(
  env: Env,
  token: string
): Promise<DashboardSession | null> {
  if (!token) return null;

  const data = await env.KV.get(SESSION_PREFIX + token);
  if (!data) return null;

  try {
    const session = JSON.parse(data) as DashboardSession;

    // Check if session has expired
    if (new Date(session.expiresAt) < new Date()) {
      await destroySession(env, token);
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

/**
 * Destroy a session by token
 */
export async function destroySession(env: Env, token: string): Promise<void> {
  await env.KV.delete(SESSION_PREFIX + token);

  // Check if this was the active user session
  const activeToken = await env.KV.get(USER_SESSION_KEY);
  if (activeToken === token) {
    await env.KV.delete(USER_SESSION_KEY);
  }
}

/**
 * Invalidate the current user's session (for single-session enforcement)
 */
async function invalidateUserSession(env: Env): Promise<void> {
  const existingToken = await env.KV.get(USER_SESSION_KEY);
  if (existingToken) {
    await env.KV.delete(SESSION_PREFIX + existingToken);
    await env.KV.delete(USER_SESSION_KEY);
  }
}

/**
 * Validate dashboard credentials against environment variables
 */
export function validateCredentials(
  env: Env,
  username: string,
  password: string
): boolean {
  const validUser = env.DASHBOARD_USER;
  const validPass = env.DASHBOARD_PASS;

  if (!validUser || !validPass) {
    console.error("Dashboard credentials not configured");
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  const userMatch =
    username.length === validUser.length &&
    timingSafeEqual(username, validUser);
  const passMatch =
    password.length === validPass.length &&
    timingSafeEqual(password, validPass);

  return userMatch && passMatch;
}

/**
 * Simple timing-safe string comparison
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
