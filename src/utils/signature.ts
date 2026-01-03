/**
 * Webhook signature utilities for Freeform
 * HMAC-SHA256 signatures for webhook verification
 */

import { hmacSha256 } from "./crypto";

/**
 * Generate webhook signature header value
 * Format: t=timestamp,v1=signature
 */
export async function generateWebhookSignature(
  payload: string,
  secret: string,
  timestamp?: number
): Promise<string> {
  const ts = timestamp || Math.floor(Date.now() / 1000);
  const signedPayload = `${ts}.${payload}`;
  const signature = await hmacSha256(signedPayload, secret);
  return `t=${ts},v1=${signature}`;
}

/**
 * Parse webhook signature header
 */
export function parseSignatureHeader(
  header: string
): { timestamp: number; signatures: string[] } | null {
  try {
    const parts = header.split(",");
    let timestamp = 0;
    const signatures: string[] = [];

    for (const part of parts) {
      const [key, value] = part.split("=");
      if (key === "t") {
        timestamp = parseInt(value, 10);
      } else if (key.startsWith("v")) {
        signatures.push(value);
      }
    }

    if (timestamp === 0 || signatures.length === 0) {
      return null;
    }

    return { timestamp, signatures };
  } catch {
    return null;
  }
}

/**
 * Verify webhook signature
 * Returns true if signature is valid and timestamp is within tolerance
 */
export async function verifyWebhookSignature(
  payload: string,
  signatureHeader: string,
  secret: string,
  toleranceSeconds: number = 300 // 5 minutes
): Promise<boolean> {
  const parsed = parseSignatureHeader(signatureHeader);
  if (!parsed) {
    return false;
  }

  // Check timestamp tolerance
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parsed.timestamp) > toleranceSeconds) {
    return false;
  }

  // Verify signature
  const signedPayload = `${parsed.timestamp}.${payload}`;
  const expectedSignature = await hmacSha256(signedPayload, secret);

  // Check if any signature matches
  return parsed.signatures.some((sig) => sig === expectedSignature);
}
