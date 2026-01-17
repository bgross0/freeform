/**
 * Submission service for Freeform
 * Handles form submission creation and management
 */

import type { D1Database } from "@cloudflare/workers-types";
import type { Submission, ParsedFormData } from "../types";
import { generateUUID } from "../utils/crypto";
import {
  createSubmission as dbCreateSubmission,
  getSubmissionById,
  listSubmissions,
  updateSubmissionRead,
  deleteSubmission as dbDeleteSubmission,
} from "./db";

/**
 * Create a new submission
 */
export async function createSubmission(
  db: D1Database,
  formId: string,
  data: ParsedFormData,
  meta: {
    ipAddress: string | null;
    userAgent: string | null;
    spamScore?: number | null;
    isSpam?: boolean;
  }
): Promise<Submission> {
  const submission: Omit<Submission, "created_at"> = {
    id: generateUUID(),
    form_id: formId,
    data: {
      ...data.fields,
      _meta: {
        submitted_at: new Date().toISOString(),
        referer: data.tracking?.referrer ?? null,
        tracking: data.tracking ?? null,
      },
    },
    ip_address: meta.ipAddress,
    user_agent: meta.userAgent,
    spam_score: meta.spamScore ?? null,
    is_spam: meta.isSpam ?? false,
    is_read: false,
  };

  return dbCreateSubmission(db, submission);
}

/**
 * Get a submission by ID
 */
export async function getSubmission(
  db: D1Database,
  id: string
): Promise<Submission | null> {
  return getSubmissionById(db, id);
}

/**
 * Get submissions for a form with pagination
 */
export async function getFormSubmissions(
  db: D1Database,
  formId: string,
  options?: {
    page?: number;
    limit?: number;
    since?: string;
    isRead?: boolean;
  }
): Promise<{ submissions: Submission[]; total: number }> {
  return listSubmissions(db, formId, options);
}

/**
 * Mark a submission as read/unread
 */
export async function markSubmissionRead(
  db: D1Database,
  id: string,
  isRead: boolean
): Promise<void> {
  return updateSubmissionRead(db, id, isRead);
}

/**
 * Delete a submission
 */
export async function deleteSubmission(
  db: D1Database,
  id: string
): Promise<void> {
  return dbDeleteSubmission(db, id);
}

/**
 * Get submission data formatted for email/webhook
 */
export function formatSubmissionData(
  submission: Submission
): Record<string, unknown> {
  // Remove internal _meta field for external use
  const data = { ...submission.data };
  delete data._meta;
  return data;
}
