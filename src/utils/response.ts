/**
 * Response helpers for Freeform
 * - HTML responses (thank-you pages, error pages)
 * - JSON responses with consistent structure
 */

import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { ErrorResponse } from "../types";

/**
 * Return an HTML response
 */
export function htmlResponse(c: Context, html: string, status: ContentfulStatusCode = 200) {
  return c.html(html, status);
}

/**
 * Return a success JSON response
 */
export function jsonSuccess<T>(c: Context, data: T, status: ContentfulStatusCode = 200) {
  return c.json(data, status);
}

/**
 * Return an error JSON response
 */
export function jsonError(
  c: Context,
  error: string,
  code: string,
  message: string,
  status: ContentfulStatusCode = 400
) {
  const response: ErrorResponse = { error, code, message };
  return c.json(response, status);
}

/**
 * Return a redirect response
 */
export function redirect(c: Context, url: string, status: 301 | 302 = 302) {
  return c.redirect(url, status);
}

/**
 * Default thank-you page HTML
 */
export function thankYouPage(_formEmail?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thank You | Freeform</title>
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
    .container { max-width: 500px; }
    h1 { font-size: 1.5rem; margin-bottom: 1rem; color: #333; }
    p { line-height: 1.6; margin-bottom: 1rem; color: #666; }
    .footer { margin-top: 2rem; font-size: 0.8rem; color: #999; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Thank You</h1>
    <p>Your submission has been received. We'll get back to you soon.</p>
    <p class="footer">Freeform</p>
  </div>
</body>
</html>`;
}

/**
 * Verification email HTML template
 */
export function verificationEmailHtml(
  verifyUrl: string,
  formEmail: string
): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Verify Your Form</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #333;">Verify Your Form</h1>
  <p>Someone submitted a form with your email address: <strong>${formEmail}</strong></p>
  <p>To receive future submissions, please verify your email by clicking the button below:</p>
  <a href="${verifyUrl}" style="display: inline-block; background: #667eea; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">Verify Email</a>
  <p style="color: #666; font-size: 14px;">This link expires in 24 hours.</p>
  <p style="color: #666; font-size: 14px;">If you didn't submit this form, you can ignore this email.</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  <p style="color: #999; font-size: 12px;">Powered by Freeform - Self-hosted form backend</p>
</body>
</html>`;
}

/**
 * Submission notification email HTML template
 */
export function submissionEmailHtml(
  formData: Record<string, unknown>,
  template: "basic" | "table" | "minimal" = "basic"
): string {
  const entries = Object.entries(formData).filter(
    ([key]) => !key.startsWith("_")
  );

  if (template === "minimal") {
    return entries.map(([key, value]) => `${key}: ${value}`).join("\n");
  }

  if (template === "table") {
    const rows = entries
      .map(
        ([key, value]) =>
          `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${key}</td><td style="padding: 8px; border: 1px solid #ddd;">${value}</td></tr>`
      )
      .join("");
    return `<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; padding: 20px;">
  <h2>New Form Submission</h2>
  <table style="border-collapse: collapse; width: 100%;">
    ${rows}
  </table>
  <p style="color: #999; font-size: 12px; margin-top: 20px;">Sent via Freeform</p>
</body>
</html>`;
  }

  // Basic template (default)
  const fields = entries
    .map(
      ([key, value]) =>
        `<p><strong>${key}:</strong><br>${String(value).replace(/\n/g, "<br>")}</p>`
    )
    .join("");
  return `<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; padding: 20px; max-width: 600px;">
  <h2 style="color: #333; border-bottom: 2px solid #667eea; padding-bottom: 10px;">New Form Submission</h2>
  ${fields}
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  <p style="color: #999; font-size: 12px;">Sent via Freeform</p>
</body>
</html>`;
}

/**
 * Error page HTML
 */
export function errorPage(title: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | Freeform</title>
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
    p { color: #666; line-height: 1.6; }
    .back-link {
      display: inline-block;
      margin-top: 1.5rem;
      color: #667eea;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">⚠️</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="javascript:history.back()" class="back-link">← Go Back</a>
  </div>
</body>
</html>`;
}
