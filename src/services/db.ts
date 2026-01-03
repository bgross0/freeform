/**
 * D1 Database helpers for Freeform
 * Type-safe query wrappers and utilities
 */

import type { D1Database } from "@cloudflare/workers-types";
import type { Form, Submission, WebhookDelivery, FormSettings } from "../types";

/**
 * Parse JSON field from D1 result
 */
function parseJson<T>(value: string | null): T {
  if (!value) return {} as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return {} as T;
  }
}

/**
 * Convert D1 row to Form entity
 */
function rowToForm(row: Record<string, unknown>): Form {
  return {
    id: row.id as string,
    email: row.email as string,
    email_hash: row.email_hash as string,
    verified_at: row.verified_at as string | null,
    settings: parseJson<FormSettings>(row.settings as string),
    user_id: row.user_id as string | null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

/**
 * Convert D1 row to Submission entity
 */
function rowToSubmission(row: Record<string, unknown>): Submission {
  return {
    id: row.id as string,
    form_id: row.form_id as string,
    data: parseJson<Record<string, unknown>>(row.data as string),
    ip_address: row.ip_address as string | null,
    user_agent: row.user_agent as string | null,
    spam_score: row.spam_score as number | null,
    is_spam: Boolean(row.is_spam),
    is_read: Boolean(row.is_read),
    created_at: row.created_at as string,
  };
}

/**
 * Convert D1 row to WebhookDelivery entity
 */
function rowToWebhookDelivery(row: Record<string, unknown>): WebhookDelivery {
  return {
    id: row.id as string,
    submission_id: row.submission_id as string,
    url: row.url as string,
    status: row.status as "pending" | "success" | "failed",
    attempts: row.attempts as number,
    last_error: row.last_error as string | null,
    next_retry_at: row.next_retry_at as string | null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

// ============================================================================
// Form Queries
// ============================================================================

export async function getFormById(
  db: D1Database,
  id: string
): Promise<Form | null> {
  const result = await db
    .prepare("SELECT * FROM forms WHERE id = ?")
    .bind(id)
    .first();
  return result ? rowToForm(result) : null;
}

export async function getFormByEmail(
  db: D1Database,
  email: string
): Promise<Form | null> {
  const result = await db
    .prepare("SELECT * FROM forms WHERE email = ?")
    .bind(email.toLowerCase().trim())
    .first();
  return result ? rowToForm(result) : null;
}

export async function getFormByHash(
  db: D1Database,
  hash: string
): Promise<Form | null> {
  const result = await db
    .prepare("SELECT * FROM forms WHERE email_hash = ?")
    .bind(hash)
    .first();
  return result ? rowToForm(result) : null;
}

export async function createForm(
  db: D1Database,
  form: Omit<Form, "created_at" | "updated_at">
): Promise<Form> {
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO forms (id, email, email_hash, verified_at, settings, user_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      form.id,
      form.email.toLowerCase().trim(),
      form.email_hash,
      form.verified_at,
      JSON.stringify(form.settings),
      form.user_id,
      now,
      now
    )
    .run();
  return { ...form, created_at: now, updated_at: now };
}

export async function updateFormVerified(
  db: D1Database,
  id: string
): Promise<void> {
  const now = new Date().toISOString();
  await db
    .prepare("UPDATE forms SET verified_at = ?, updated_at = ? WHERE id = ?")
    .bind(now, now, id)
    .run();
}

export async function updateFormSettings(
  db: D1Database,
  id: string,
  settings: FormSettings
): Promise<void> {
  const now = new Date().toISOString();
  await db
    .prepare("UPDATE forms SET settings = ?, updated_at = ? WHERE id = ?")
    .bind(JSON.stringify(settings), now, id)
    .run();
}

export async function listForms(
  db: D1Database,
  userId: string | null,
  page: number = 1,
  limit: number = 20
): Promise<{ forms: Form[]; total: number }> {
  const offset = (page - 1) * limit;

  let query = "SELECT * FROM forms";
  let countQuery = "SELECT COUNT(*) as count FROM forms";
  const bindings: (string | number)[] = [];

  if (userId) {
    query += " WHERE user_id = ?";
    countQuery += " WHERE user_id = ?";
    bindings.push(userId);
  }

  query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
  bindings.push(limit, offset);

  const [results, countResult] = await Promise.all([
    db
      .prepare(query)
      .bind(...bindings)
      .all(),
    userId
      ? db.prepare(countQuery).bind(userId).first()
      : db.prepare(countQuery).first(),
  ]);

  return {
    forms: (results.results || []).map(rowToForm),
    total: (countResult?.count as number) || 0,
  };
}

// ============================================================================
// Submission Queries
// ============================================================================

export async function createSubmission(
  db: D1Database,
  submission: Omit<Submission, "created_at">
): Promise<Submission> {
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO submissions (id, form_id, data, ip_address, user_agent, spam_score, is_spam, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      submission.id,
      submission.form_id,
      JSON.stringify(submission.data),
      submission.ip_address,
      submission.user_agent,
      submission.spam_score,
      submission.is_spam ? 1 : 0,
      submission.is_read ? 1 : 0,
      now
    )
    .run();
  return { ...submission, created_at: now };
}

export async function getSubmissionById(
  db: D1Database,
  id: string
): Promise<Submission | null> {
  const result = await db
    .prepare("SELECT * FROM submissions WHERE id = ?")
    .bind(id)
    .first();
  return result ? rowToSubmission(result) : null;
}

export async function listSubmissions(
  db: D1Database,
  formId: string,
  options: {
    page?: number;
    limit?: number;
    since?: string;
    isRead?: boolean;
  } = {}
): Promise<{ submissions: Submission[]; total: number }> {
  const { page = 1, limit = 20, since, isRead } = options;
  const offset = (page - 1) * limit;

  let query = "SELECT * FROM submissions WHERE form_id = ?";
  let countQuery = "SELECT COUNT(*) as count FROM submissions WHERE form_id = ?";
  const bindings: (string | number)[] = [formId];
  const countBindings: (string | number)[] = [formId];

  if (since) {
    query += " AND created_at > ?";
    countQuery += " AND created_at > ?";
    bindings.push(since);
    countBindings.push(since);
  }

  if (isRead !== undefined) {
    query += " AND is_read = ?";
    countQuery += " AND is_read = ?";
    bindings.push(isRead ? 1 : 0);
    countBindings.push(isRead ? 1 : 0);
  }

  query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
  bindings.push(limit, offset);

  const [results, countResult] = await Promise.all([
    db
      .prepare(query)
      .bind(...bindings)
      .all(),
    db
      .prepare(countQuery)
      .bind(...countBindings)
      .first(),
  ]);

  return {
    submissions: (results.results || []).map(rowToSubmission),
    total: (countResult?.count as number) || 0,
  };
}

export async function updateSubmissionRead(
  db: D1Database,
  id: string,
  isRead: boolean
): Promise<void> {
  await db
    .prepare("UPDATE submissions SET is_read = ? WHERE id = ?")
    .bind(isRead ? 1 : 0, id)
    .run();
}

export async function deleteSubmission(
  db: D1Database,
  id: string
): Promise<void> {
  await db.prepare("DELETE FROM submissions WHERE id = ?").bind(id).run();
}

// ============================================================================
// Webhook Delivery Queries
// ============================================================================

export async function createWebhookDelivery(
  db: D1Database,
  delivery: Omit<WebhookDelivery, "created_at" | "updated_at">
): Promise<WebhookDelivery> {
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO webhook_deliveries (id, submission_id, url, status, attempts, last_error, next_retry_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      delivery.id,
      delivery.submission_id,
      delivery.url,
      delivery.status,
      delivery.attempts,
      delivery.last_error,
      delivery.next_retry_at,
      now,
      now
    )
    .run();
  return { ...delivery, created_at: now, updated_at: now };
}

export async function updateWebhookDelivery(
  db: D1Database,
  id: string,
  updates: Partial<
    Pick<WebhookDelivery, "status" | "attempts" | "last_error" | "next_retry_at">
  >
): Promise<void> {
  const now = new Date().toISOString();
  const fields: string[] = ["updated_at = ?"];
  const values: (string | number | null)[] = [now];

  if (updates.status !== undefined) {
    fields.push("status = ?");
    values.push(updates.status);
  }
  if (updates.attempts !== undefined) {
    fields.push("attempts = ?");
    values.push(updates.attempts);
  }
  if (updates.last_error !== undefined) {
    fields.push("last_error = ?");
    values.push(updates.last_error);
  }
  if (updates.next_retry_at !== undefined) {
    fields.push("next_retry_at = ?");
    values.push(updates.next_retry_at);
  }

  values.push(id);
  await db
    .prepare(`UPDATE webhook_deliveries SET ${fields.join(", ")} WHERE id = ?`)
    .bind(...values)
    .run();
}

export async function getWebhookDeliveryById(
  db: D1Database,
  id: string
): Promise<WebhookDelivery | null> {
  const result = await db
    .prepare("SELECT * FROM webhook_deliveries WHERE id = ?")
    .bind(id)
    .first();
  return result ? rowToWebhookDelivery(result) : null;
}
