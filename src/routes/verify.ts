/**
 * Email verification route for Freeform
 * GET /verify/:token - Verify email ownership
 */

import { Hono } from "hono";
import type { Env } from "../types/env.d";
import { verifyToken, deleteVerificationToken } from "../services/verification";
import { resolveForm, verifyForm } from "../services/form";
import { htmlResponse } from "../utils/response";
import { ValidationError } from "../middleware/error";

const verifyRouter = new Hono<{ Bindings: Env }>();

/**
 * Verify email ownership via token
 */
verifyRouter.get("/:token", async (c) => {
  const token = c.req.param("token");

  // Verify the token
  const data = await verifyToken(c.env.KV, token);
  if (!data) {
    return htmlResponse(c, tokenExpiredPage(), 400);
  }

  // Get or create the form
  const result = await resolveForm(c.env.DB, data.email);
  if (!result) {
    throw new ValidationError("Form not found for this email");
  }

  // Mark form as verified
  await verifyForm(c.env.DB, result.form.id);

  // Delete the verification token
  await deleteVerificationToken(c.env.KV, token, data.email);

  // Show success page
  return htmlResponse(c, verificationSuccessPage(data.email));
});

/**
 * Token expired/invalid page
 */
function tokenExpiredPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Link Expired | Freeform</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f5f5f5;
      color: #333;
    }
    .container {
      text-align: center;
      padding: 2rem;
      max-width: 500px;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }
    .icon { font-size: 3rem; margin-bottom: 1rem; }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; color: #e53935; }
    p { color: #666; line-height: 1.6; margin-bottom: 1rem; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">⏰</div>
    <h1>Link Expired</h1>
    <p>This verification link has expired or is invalid.</p>
    <p>Please submit the form again to receive a new verification email.</p>
  </div>
</body>
</html>`;
}

/**
 * Verification success page
 */
function verificationSuccessPage(email: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Verified | Freeform</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #fff;
      color: #333;
      padding: 20px;
    }
    .container {
      max-width: 500px;
    }
    h1 { font-size: 1.5rem; margin-bottom: 1rem; color: #333; }
    p { line-height: 1.6; margin-bottom: 1rem; color: #666; }
    .email { font-weight: 600; color: #333; }
    .footer { margin-top: 2rem; font-size: 0.8rem; color: #999; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Email Verified</h1>
    <p>You'll now receive form submissions at <span class="email">${email}</span></p>
    <p>All future submissions will be delivered to your inbox immediately.</p>
    <p class="footer">Freeform</p>
  </div>
</body>
</html>`;
}

export { verifyRouter };
