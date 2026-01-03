/**
 * API Key routes for Freeform
 * Email-based API key generation (FormSubmit-style)
 */

import { Hono } from "hono";
import type { Env } from "../../types/env.d";
import { getFormByEmail } from "../../services/db";
import { createApiKey } from "../../middleware/auth";
import { sendEmail } from "../../services/email";

const apikeyRouter = new Hono<{ Bindings: Env }>();

/**
 * GET /api/get-apikey/:email
 * Request an API key - sends it to the email address
 */
apikeyRouter.get("/get-apikey/:email", async (c) => {
  const email = c.req.param("email").toLowerCase().trim();

  // Validate email format
  if (!isValidEmail(email)) {
    return c.json({
      success: false,
      message: "Invalid email address.",
    }, 400);
  }

  // Find form for this email
  const form = await getFormByEmail(c.env.DB, email);

  if (!form) {
    return c.json({
      success: false,
      message: "No form found for this email. Submit a form first to create one.",
    }, 404);
  }

  if (!form.verified_at) {
    return c.json({
      success: false,
      message: "Email not verified. Please verify your email first by submitting a form.",
    }, 403);
  }

  // Generate API key with full permissions
  const apiKey = await createApiKey(
    c.env.KV,
    form.id,
    email,
    ["read", "write", "delete"]
  );

  // Send API key via email
  try {
    await sendEmail(c.env, {
      to: email,
      from: c.env.FROM_EMAIL,
      fromName: c.env.FROM_NAME || "Freeform",
      subject: "Your Freeform API Key",
      html: apiKeyEmailHtml(apiKey, form.id),
    });

    return c.json({
      success: true,
      message: "We have sent an email with the API key. Please find your API key in your mailbox.",
    });
  } catch (error) {
    console.error("Failed to send API key email:", error);
    return c.json({
      success: false,
      message: "Failed to send email. Please try again later.",
    }, 500);
  }
});

/**
 * GET /api/get-submissions/:apikey
 * Get all submissions for the API key's form (FormSubmit-style)
 */
apikeyRouter.get("/get-submissions/:apikey", async (c) => {
  const apiKey = c.req.param("apikey");

  // Validate API key
  const keyData = await c.env.KV.get<{
    formId: string;
    email: string;
    permissions: string[];
  }>(`apikey:${apiKey}`, "json");

  if (!keyData) {
    return c.json({
      success: false,
      message: "Invalid API key.",
    }, 401);
  }

  // Get submissions for this form
  const result = await c.env.DB.prepare(`
    SELECT id, form_id, data, ip_address, created_at
    FROM submissions
    WHERE form_id = ?
    AND is_spam = 0
    ORDER BY created_at DESC
    LIMIT 100
  `).bind(keyData.formId).all();

  const submissions = result.results.map((row: Record<string, unknown>) => ({
    form_data: typeof row.data === "string" ? JSON.parse(row.data as string) : row.data,
    submitted_at: {
      date: row.created_at,
      timezone: "UTC",
    },
  }));

  return c.json({
    success: true,
    submissions,
  });
});

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * API key email HTML template
 */
function apiKeyEmailHtml(apiKey: string, formId: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; background: #f5f5f5;">
  <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <h1 style="margin: 0 0 20px; color: #333; font-size: 24px;">Your Freeform API Key</h1>

    <p style="color: #666; line-height: 1.6;">Here is your API key for accessing your form submissions:</p>

    <div style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 4px; padding: 15px; margin: 20px 0; font-family: monospace; font-size: 14px; word-break: break-all;">
      ${apiKey}
    </div>

    <p style="color: #666; line-height: 1.6;"><strong>Form ID:</strong> ${formId}</p>

    <p style="color: #666; line-height: 1.6; margin-top: 20px;">To retrieve your submissions, make a GET request to:</p>
    <p style="background: #f8f9fa; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 13px; word-break: break-all;">
      /api/get-submissions/YOUR_API_KEY
    </p>

    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

    <p style="color: #999; font-size: 12px;">Keep this API key secure. Do not share it publicly.</p>
  </div>
</body>
</html>`;
}

export { apikeyRouter };
