/**
 * Form service for Freeform
 * Handles form creation, lookup, and management
 */

import type { D1Database } from "@cloudflare/workers-types";
import type { Form, FormSettings } from "../types";
import { generateUUID, sha256 } from "../utils/crypto";
import {
  getFormById,
  getFormByEmail,
  getFormByHash,
  createForm as dbCreateForm,
  updateFormVerified,
} from "./db";

/**
 * Get or create a form for the given email
 * If the form doesn't exist, creates a new unverified form
 */
export async function getOrCreateForm(
  db: D1Database,
  email: string
): Promise<{ form: Form; isNew: boolean }> {
  const normalizedEmail = email.toLowerCase().trim();

  // Try to find existing form by email
  let form = await getFormByEmail(db, normalizedEmail);
  if (form) {
    return { form, isNew: false };
  }

  // Create new form
  const emailHash = await sha256(normalizedEmail);
  const newForm: Omit<Form, "created_at" | "updated_at"> = {
    id: generateUUID(),
    email: normalizedEmail,
    email_hash: emailHash,
    verified_at: null,
    settings: getDefaultSettings(),
    user_id: null,
  };

  form = await dbCreateForm(db, newForm);
  return { form, isNew: true };
}

/**
 * Resolve form from target (email, hash, or form ID)
 */
export async function resolveForm(
  db: D1Database,
  target: string
): Promise<{ form: Form; isNew: boolean } | null> {
  // Check if target is a UUID (form ID)
  if (isUUID(target)) {
    const form = await getFormById(db, target);
    if (form) {
      return { form, isNew: false };
    }
  }

  // Check if target is a hash (64 chars hex)
  if (isHash(target)) {
    const form = await getFormByHash(db, target);
    if (form) {
      return { form, isNew: false };
    }
  }

  // Check if target is an email
  if (isEmail(target)) {
    return getOrCreateForm(db, target);
  }

  // Check if target starts with 'f/' (hash prefix)
  if (target.startsWith("f/")) {
    const hash = target.slice(2);
    const form = await getFormByHash(db, hash);
    if (form) {
      return { form, isNew: false };
    }
  }

  return null;
}

/**
 * Mark a form as verified
 */
export async function verifyForm(db: D1Database, formId: string): Promise<void> {
  await updateFormVerified(db, formId);
}

/**
 * Check if form is verified
 */
export function isFormVerified(form: Form): boolean {
  return form.verified_at !== null;
}

/**
 * Get default form settings
 */
function getDefaultSettings(): FormSettings {
  return {
    default_subject: "New form submission",
    default_template: "basic",
    recaptcha_enabled: true,
    recaptcha_threshold: 0.5,
    allowed_origins: ["*"],
    webhook_url: null,
    cc_emails: [],
  };
}

/**
 * Validate email format
 */
function isEmail(value: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

/**
 * Check if value is a UUID
 */
function isUUID(value: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Check if value is a SHA256 hash (64 hex chars)
 */
function isHash(value: string): boolean {
  return /^[0-9a-f]{64}$/i.test(value);
}
