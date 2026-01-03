/**
 * Forms API for Freeform
 * REST endpoints for managing forms
 */

import { Hono } from "hono";
import type { Env } from "../../types/env.d";
import { getFormById, updateFormSettings } from "../../services/db";
import { apiAuthMiddleware, createApiKey } from "../../middleware/auth";
import type { FormSettings } from "../../types";

const formsRouter = new Hono<{ Bindings: Env }>();

/**
 * GET /api/forms/:formId
 * Get form details (requires auth)
 */
formsRouter.get("/:formId", apiAuthMiddleware(["read"]), async (c) => {
  const formId = c.req.param("formId");
  const apiKeyData = c.get("apiKeyData") as { formId: string };

  // Verify API key matches requested form
  if (apiKeyData.formId !== formId) {
    return c.json(
      {
        error: "forbidden",
        code: "FORM_MISMATCH",
        message: "API key is not authorized for this form.",
      },
      403
    );
  }

  const form = await getFormById(c.env.DB, formId);

  if (!form) {
    return c.json(
      {
        error: "not_found",
        code: "FORM_NOT_FOUND",
        message: "Form not found.",
      },
      404
    );
  }

  return c.json({
    id: form.id,
    email_hash: form.email_hash,
    verified: !!form.verified_at,
    settings: form.settings,
    created_at: form.created_at,
  });
});

/**
 * PATCH /api/forms/:formId
 * Update form settings (requires write auth)
 */
formsRouter.patch("/:formId", apiAuthMiddleware(["write"]), async (c) => {
  const formId = c.req.param("formId");
  const apiKeyData = c.get("apiKeyData") as { formId: string };

  // Verify API key matches requested form
  if (apiKeyData.formId !== formId) {
    return c.json(
      {
        error: "forbidden",
        code: "FORM_MISMATCH",
        message: "API key is not authorized for this form.",
      },
      403
    );
  }

  const form = await getFormById(c.env.DB, formId);

  if (!form) {
    return c.json(
      {
        error: "not_found",
        code: "FORM_NOT_FOUND",
        message: "Form not found.",
      },
      404
    );
  }

  // Parse and validate settings update
  const body = await c.req.json<Partial<FormSettings>>();

  const allowedFields: (keyof FormSettings)[] = [
    "default_subject",
    "default_template",
    "recaptcha_enabled",
    "recaptcha_threshold",
    "allowed_origins",
    "webhook_url",
    "cc_emails",
  ];

  const updates: Partial<FormSettings> = {};

  for (const field of allowedFields) {
    if (field in body) {
      (updates as Record<string, unknown>)[field] = body[field];
    }
  }

  // Merge with existing settings
  const newSettings: FormSettings = {
    ...form.settings,
    ...updates,
  };

  await updateFormSettings(c.env.DB, formId, newSettings);

  return c.json({ success: true, settings: newSettings });
});

/**
 * POST /api/forms/:formId/api-key
 * Generate a new API key for a form (requires verification via email link)
 * This is a special endpoint - accessed via verification flow, not API auth
 */
formsRouter.post("/:formId/api-key", async (c) => {
  const formId = c.req.param("formId");

  // Get the verification token from body
  const body = await c.req.json<{
    verification_token: string;
    permissions?: ("read" | "write" | "delete")[];
  }>();

  if (!body.verification_token) {
    return c.json(
      {
        error: "bad_request",
        code: "MISSING_TOKEN",
        message: "Verification token required.",
      },
      400
    );
  }

  // Verify the token matches this form
  const tokenData = await c.env.KV.get<{ formId: string; email: string }>(
    `apikey_verify:${body.verification_token}`,
    "json"
  );

  if (!tokenData || tokenData.formId !== formId) {
    return c.json(
      {
        error: "unauthorized",
        code: "INVALID_TOKEN",
        message: "Invalid or expired verification token.",
      },
      401
    );
  }

  // Generate API key
  const permissions = body.permissions || ["read"];
  const apiKey = await createApiKey(
    c.env.KV,
    formId,
    tokenData.email,
    permissions
  );

  // Delete the verification token
  await c.env.KV.delete(`apikey_verify:${body.verification_token}`);

  return c.json({
    api_key: apiKey,
    permissions,
    message:
      "Store this API key securely. It will not be shown again.",
  });
});

export { formsRouter };
