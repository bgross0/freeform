/**
 * Spam detection service for Freeform
 * Honeypot, blacklist, and reCAPTCHA checks
 */

import type { Env } from "../types/env.d";
import type { ParsedFormData } from "../types";

// Spam check result
export interface SpamCheckResult {
  isSpam: boolean;
  score: number; // 0-100, higher = more likely spam
  reasons: string[];
}

// Common honeypot field names
const HONEYPOT_FIELDS = [
  "_honeypot",
  "_gotcha",
  "honeypot",
  "hp",
  "website", // Often used as honeypot
  "url",
  "fax",
];

// Default blacklist phrases (can be extended per-form)
const DEFAULT_BLACKLIST = [
  "viagra",
  "casino",
  "lottery",
  "prince nigeria",
  "wire transfer",
  "bitcoin investment",
  "crypto doubling",
];

/**
 * Check honeypot fields
 * Returns true if spam detected
 */
export function checkHoneypot(formData: ParsedFormData): boolean {
  // Check special honeypot fields
  if (formData.specialFields._honeypot) return true;
  if (formData.specialFields._gotcha) return true;

  // Check common honeypot field names
  for (const field of HONEYPOT_FIELDS) {
    const value = formData.fields[field];
    if (value && typeof value === "string" && value.trim() !== "") {
      return true;
    }
  }

  return false;
}

/**
 * Check for blacklisted phrases
 */
export function checkBlacklist(
  formData: ParsedFormData,
  customBlacklist?: string
): string[] {
  const blacklist = [...DEFAULT_BLACKLIST];

  // Add custom blacklist phrases
  if (customBlacklist) {
    blacklist.push(
      ...customBlacklist.split(",").map((s) => s.trim().toLowerCase())
    );
  }

  const matches: string[] = [];

  // Check all text fields
  for (const [, value] of Object.entries(formData.fields)) {
    if (typeof value !== "string") continue;
    const lowerValue = value.toLowerCase();

    for (const phrase of blacklist) {
      if (lowerValue.includes(phrase)) {
        matches.push(phrase);
      }
    }
  }

  return [...new Set(matches)]; // Dedupe
}

/**
 * Verify reCAPTCHA v3 token
 */
export async function verifyRecaptcha(
  env: Env,
  token: string,
  ip: string | null
): Promise<{ success: boolean; score: number }> {
  if (!env.RECAPTCHA_SECRET_KEY) {
    return { success: true, score: 1.0 }; // Skip if not configured
  }

  const formData = new FormData();
  formData.append("secret", env.RECAPTCHA_SECRET_KEY);
  formData.append("response", token);
  if (ip) formData.append("remoteip", ip);

  try {
    const response = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      { method: "POST", body: formData }
    );

    const result = await response.json() as {
      success: boolean;
      score?: number;
      "error-codes"?: string[];
    };

    return {
      success: result.success,
      score: result.score ?? 0,
    };
  } catch (error) {
    console.error("reCAPTCHA verification failed:", error);
    return { success: false, score: 0 };
  }
}

/**
 * Perform comprehensive spam check
 */
export async function checkSpam(
  env: Env,
  formData: ParsedFormData,
  ip: string | null,
  recaptchaThreshold: number = 0.5
): Promise<SpamCheckResult> {
  const reasons: string[] = [];
  let score = 0;

  // 1. Honeypot check (high confidence spam)
  if (checkHoneypot(formData)) {
    reasons.push("honeypot_triggered");
    score += 80;
  }

  // 2. Blacklist check
  const blacklistMatches = checkBlacklist(
    formData,
    formData.specialFields._blacklist
  );
  if (blacklistMatches.length > 0) {
    reasons.push(`blacklist:${blacklistMatches.join(",")}`);
    score += 20 * Math.min(blacklistMatches.length, 3);
  }

  // 3. reCAPTCHA check
  if (formData.specialFields._captcha) {
    const recaptcha = await verifyRecaptcha(
      env,
      formData.specialFields._captcha,
      ip
    );

    if (!recaptcha.success) {
      reasons.push("recaptcha_failed");
      score += 50;
    } else if (recaptcha.score < recaptchaThreshold) {
      reasons.push(`recaptcha_low_score:${recaptcha.score}`);
      score += Math.round((recaptchaThreshold - recaptcha.score) * 100);
    }
  }

  // 4. Basic heuristics
  // Check for too many links
  const allText = Object.values(formData.fields)
    .filter((v) => typeof v === "string")
    .join(" ");

  const linkCount = (allText.match(/https?:\/\//gi) || []).length;
  if (linkCount > 3) {
    reasons.push(`too_many_links:${linkCount}`);
    score += 10 * Math.min(linkCount - 3, 5);
  }

  // Normalize score to 0-100
  score = Math.min(100, score);

  return {
    isSpam: score >= 50,
    score,
    reasons,
  };
}

/**
 * Quick spam check (honeypot only, synchronous)
 */
export function quickSpamCheck(formData: ParsedFormData): boolean {
  return checkHoneypot(formData);
}
