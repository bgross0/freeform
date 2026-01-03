/**
 * Email verification service for Freeform
 * Handles verification token generation and validation
 */

import type { ParsedFormData } from "../types";
import type { Env } from "../types/env.d";
import { generateToken } from "../utils/crypto";

// KV key prefix for verification tokens
const VERIFY_PREFIX = "verify:";

// Token expiry: 24 hours
const TOKEN_EXPIRY_SECONDS = 86400;

interface VerificationData {
  email: string;
  submission_id: string;
  form_data: ParsedFormData;
  created_at: string;
}

/**
 * Create a verification token for an email
 * Stores the token in KV with the pending submission data
 */
export async function createVerificationToken(
  kv: KVNamespace,
  email: string,
  submissionId: string,
  formData: ParsedFormData
): Promise<string> {
  const token = generateToken(32);
  const data: VerificationData = {
    email: email.toLowerCase().trim(),
    submission_id: submissionId,
    form_data: formData,
    created_at: new Date().toISOString(),
  };

  await kv.put(`${VERIFY_PREFIX}${token}`, JSON.stringify(data), {
    expirationTtl: TOKEN_EXPIRY_SECONDS,
  });

  // Also store a mapping from email to token for lookup
  await kv.put(`${VERIFY_PREFIX}email:${email.toLowerCase().trim()}`, token, {
    expirationTtl: TOKEN_EXPIRY_SECONDS,
  });

  return token;
}

/**
 * Verify a token and return the verification data
 * Returns null if token is invalid or expired
 */
export async function verifyToken(
  kv: KVNamespace,
  token: string
): Promise<VerificationData | null> {
  const data = await kv.get(`${VERIFY_PREFIX}${token}`);
  if (!data) {
    return null;
  }

  try {
    return JSON.parse(data) as VerificationData;
  } catch {
    return null;
  }
}

/**
 * Delete a verification token after successful verification
 */
export async function deleteVerificationToken(
  kv: KVNamespace,
  token: string,
  email: string
): Promise<void> {
  await Promise.all([
    kv.delete(`${VERIFY_PREFIX}${token}`),
    kv.delete(`${VERIFY_PREFIX}email:${email.toLowerCase().trim()}`),
  ]);
}

/**
 * Get the verification token for an email (if exists)
 */
export async function getTokenForEmail(
  kv: KVNamespace,
  email: string
): Promise<string | null> {
  return kv.get(`${VERIFY_PREFIX}email:${email.toLowerCase().trim()}`);
}

/**
 * Send verification email
 */
export async function sendVerificationEmail(
  env: Env,
  email: string,
  verifyUrl: string
): Promise<void> {
  // Import email service
  const { sendEmail } = await import("./email");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Verify Your Form</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #333;">Verify Your Form</h1>
  <p>Someone submitted a form with your email address: <strong>${email}</strong></p>
  <p>To receive future submissions, please verify your email by clicking the button below:</p>
  <a href="${verifyUrl}" style="display: inline-block; background: #667eea; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">Verify Email</a>
  <p style="color: #666; font-size: 14px;">This link expires in 24 hours.</p>
  <p style="color: #666; font-size: 14px;">If you didn't submit this form, you can ignore this email.</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  <p style="color: #999; font-size: 12px;">Powered by Freeform - Self-hosted form backend</p>
</body>
</html>`;

  await sendEmail(env, {
    to: email,
    from: env.FROM_EMAIL,
    fromName: env.FROM_NAME,
    subject: "Verify your form email",
    html,
  });
}
