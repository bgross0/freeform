/**
 * API authentication middleware for Freeform
 * Validates API keys for protected endpoints
 */

import type { Context, Next } from "hono";
import type { Env } from "../types/env.d";

// KV key prefix for API keys
const API_KEY_PREFIX = "apikey:";

interface ApiKeyData {
  formId: string;
  email: string;
  permissions: ("read" | "write" | "delete")[];
  createdAt: string;
}

/**
 * Validate an API key and return associated data
 */
async function validateApiKey(
  kv: KVNamespace,
  apiKey: string
): Promise<ApiKeyData | null> {
  const key = `${API_KEY_PREFIX}${apiKey}`;
  return kv.get<ApiKeyData>(key, "json");
}

/**
 * Create an API key for a form
 */
export async function createApiKey(
  kv: KVNamespace,
  formId: string,
  email: string,
  permissions: ("read" | "write" | "delete")[] = ["read"]
): Promise<string> {
  // Generate a secure API key
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const apiKey = `ff_${Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")}`;

  const data: ApiKeyData = {
    formId,
    email,
    permissions,
    createdAt: new Date().toISOString(),
  };

  await kv.put(`${API_KEY_PREFIX}${apiKey}`, JSON.stringify(data));

  return apiKey;
}

/**
 * Delete an API key
 */
export async function deleteApiKey(
  kv: KVNamespace,
  apiKey: string
): Promise<void> {
  await kv.delete(`${API_KEY_PREFIX}${apiKey}`);
}

/**
 * API authentication middleware
 */
export function apiAuthMiddleware(
  requiredPermissions: ("read" | "write" | "delete")[] = ["read"]
) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    // Get API key from header or query param
    const authHeader = c.req.header("Authorization");
    let apiKey: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      apiKey = authHeader.slice(7);
    } else {
      apiKey = c.req.query("api_key") || null;
    }

    if (!apiKey) {
      return c.json(
        {
          error: "unauthorized",
          code: "MISSING_API_KEY",
          message: "API key required. Use Authorization: Bearer <key> header.",
        },
        401
      );
    }

    // Validate API key
    const keyData = await validateApiKey(c.env.KV, apiKey);

    if (!keyData) {
      return c.json(
        {
          error: "unauthorized",
          code: "INVALID_API_KEY",
          message: "Invalid API key.",
        },
        401
      );
    }

    // Check permissions
    const hasPermission = requiredPermissions.every((p) =>
      keyData.permissions.includes(p)
    );

    if (!hasPermission) {
      return c.json(
        {
          error: "forbidden",
          code: "INSUFFICIENT_PERMISSIONS",
          message: `API key lacks required permissions: ${requiredPermissions.join(", ")}`,
        },
        403
      );
    }

    // Attach key data to context for later use
    c.set("apiKeyData", keyData);

    return next();
  };
}

/**
 * Simple auth check - just validates key exists
 */
export const requireAuth = apiAuthMiddleware(["read"]);

/**
 * Write auth - requires write permission
 */
export const requireWriteAuth = apiAuthMiddleware(["write"]);

/**
 * Delete auth - requires delete permission
 */
export const requireDeleteAuth = apiAuthMiddleware(["delete"]);
