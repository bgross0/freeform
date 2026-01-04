/**
 * Form data parsing utilities
 * Handles URL-encoded, multipart, and JSON content types
 */

import type { Context } from "hono";
import type { ParsedFormData, SpecialFields } from "../types";

/**
 * Special field names (underscore-prefixed)
 */
const SPECIAL_FIELDS = [
  "_replyto",
  "_next",
  "_subject",
  "_cc",
  "_blacklist",
  "_captcha",
  "_autoresponse",
  "_template",
  "_webhook",
  "_honeypot",
  "_gotcha",
  "g-recaptcha-response",
  "h-captcha-response",
];

/**
 * Parse form data from request based on content type
 */
export async function parseFormData(c: Context): Promise<ParsedFormData> {
  const contentType = c.req.header("Content-Type") || "";

  let rawData: Record<string, unknown> = {};
  const files: File[] = [];

  if (contentType.includes("application/json")) {
    rawData = await c.req.json();
  } else if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const formData = await c.req.formData();
    for (const [key, value] of formData.entries()) {
      // Collect files separately
      if (typeof value === "object" && value !== null && "name" in value && "size" in value) {
        const file = value as File;
        if (file.size > 0) {
          files.push(file);
          rawData[key] = `[File: ${file.name}]`;
          continue;
        }
      }

      // Handle multiple values with same key
      if (rawData[key] !== undefined) {
        const existing = rawData[key];
        if (Array.isArray(existing)) {
          existing.push(value);
        } else {
          rawData[key] = [existing, value];
        }
      } else {
        rawData[key] = value;
      }
    }
  } else {
    // Try to parse as form data anyway
    try {
      const formData = await c.req.formData();
      for (const [key, value] of formData.entries()) {
        if (typeof value === "object" && value !== null && "name" in value && "size" in value) {
          const file = value as File;
          if (file.size > 0) {
            files.push(file);
            rawData[key] = `[File: ${file.name}]`;
          }
        } else {
          rawData[key] = value;
        }
      }
    } catch {
      // Empty form data
    }
  }

  const result = extractSpecialFields(rawData);
  result.files = files.length > 0 ? files : undefined;
  return result;
}

/**
 * Extract special fields from raw form data
 */
function extractSpecialFields(
  rawData: Record<string, unknown>
): ParsedFormData {
  const fields: Record<string, unknown> = {};
  const specialFields: SpecialFields = {};

  for (const [key, value] of Object.entries(rawData)) {
    const lowerKey = key.toLowerCase();

    // Check if it's a special field
    if (SPECIAL_FIELDS.includes(lowerKey) || key.startsWith("_")) {
      // Map to normalized special field name
      switch (lowerKey) {
        case "_replyto":
        case "email":
          if (!specialFields._replyto) {
            specialFields._replyto = String(value);
          }
          // Also include email in regular fields
          if (lowerKey === "email") {
            fields[key] = value;
          }
          break;
        case "_next":
          specialFields._next = String(value);
          break;
        case "_subject":
          specialFields._subject = String(value);
          break;
        case "_cc":
          specialFields._cc = String(value);
          break;
        case "_blacklist":
          specialFields._blacklist = String(value);
          break;
        case "_captcha":
          specialFields._captcha = String(value);
          break;
        case "_autoresponse":
          specialFields._autoresponse = String(value);
          break;
        case "_template":
          const template = String(value).toLowerCase();
          if (["basic", "table", "minimal"].includes(template)) {
            specialFields._template = template as "basic" | "table" | "minimal";
          }
          break;
        case "_webhook":
          specialFields._webhook = String(value);
          break;
        case "_honeypot":
          specialFields._honeypot = String(value);
          break;
        case "_gotcha":
          specialFields._gotcha = String(value);
          break;
        default:
          // Include other underscore fields in regular fields
          if (!key.startsWith("_")) {
            fields[key] = value;
          }
      }
    } else if (lowerKey === "g-recaptcha-response" || lowerKey === "h-captcha-response") {
      // Store captcha token but don't include in fields
      (specialFields as Record<string, unknown>)[lowerKey] = String(value);
    } else {
      // Regular field
      fields[key] = value instanceof File ? `[File: ${value.name}]` : value;
    }
  }

  return { fields, specialFields };
}

/**
 * Get the email from form data
 * Checks _replyto first, then looks for common email field names
 */
export function getSubmitterEmail(data: ParsedFormData): string | undefined {
  if (data.specialFields._replyto) {
    return data.specialFields._replyto;
  }

  // Look for common email field names
  const emailFields = ["email", "Email", "EMAIL", "e-mail", "mail"];
  for (const field of emailFields) {
    if (typeof data.fields[field] === "string" && isValidEmail(data.fields[field] as string)) {
      return data.fields[field] as string;
    }
  }

  return undefined;
}

/**
 * Basic email validation
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Parse CC emails from comma-separated string
 */
export function parseCcEmails(cc: string | undefined): string[] {
  if (!cc) return [];
  return cc
    .split(",")
    .map((e) => e.trim())
    .filter((e) => isValidEmail(e));
}
