import type { Form, FormSettings, Submission, FormWithCounts } from "../types";

interface SubmissionQueryOptions {
  page: number;
  limit: number;
  search?: string;
  startDate?: string;
  endDate?: string;
}

interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    has_more: boolean;
  };
}

/**
 * Get all forms with submission counts
 */
export async function getFormsWithCounts(
  db: D1Database
): Promise<FormWithCounts[]> {
  const result = await db
    .prepare(
      `
    SELECT
      f.*,
      COUNT(s.id) as submission_count,
      SUM(CASE WHEN s.is_read = 0 THEN 1 ELSE 0 END) as unread_count,
      MAX(s.created_at) as latest_submission_at
    FROM forms f
    LEFT JOIN submissions s ON f.id = s.form_id
    GROUP BY f.id
    ORDER BY latest_submission_at DESC NULLS LAST, f.created_at DESC
  `
    )
    .all();

  return (result.results || []).map((row) => ({
    ...parseForm(row),
    submission_count: Number(row.submission_count) || 0,
    unread_count: Number(row.unread_count) || 0,
    latest_submission_at: row.latest_submission_at as string | null,
  }));
}

/**
 * Get a single form by ID
 */
export async function getFormById(
  db: D1Database,
  formId: string
): Promise<Form | null> {
  const result = await db
    .prepare("SELECT * FROM forms WHERE id = ?")
    .bind(formId)
    .first();

  if (!result) return null;

  return parseForm(result);
}

/**
 * Update form settings
 */
export async function updateFormSettings(
  db: D1Database,
  formId: string,
  updates: Partial<FormSettings>
): Promise<Form> {
  const form = await getFormById(db, formId);
  if (!form) throw new Error("Form not found");

  const newSettings = { ...form.settings, ...updates };
  const now = new Date().toISOString();

  await db
    .prepare("UPDATE forms SET settings = ?, updated_at = ? WHERE id = ?")
    .bind(JSON.stringify(newSettings), now, formId)
    .run();

  return { ...form, settings: newSettings, updated_at: now };
}

/**
 * Get submissions with pagination and search
 */
export async function getSubmissions(
  db: D1Database,
  formId: string,
  options: SubmissionQueryOptions
): Promise<PaginatedResult<Submission>> {
  const { page, limit, search, startDate, endDate } = options;
  const offset = (page - 1) * limit;

  // Build WHERE clause
  const conditions: string[] = ["form_id = ?"];
  const params: (string | number)[] = [formId];

  if (search) {
    // Search in JSON data column using LIKE
    conditions.push("data LIKE ?");
    params.push(`%${search}%`);
  }

  if (startDate) {
    conditions.push("created_at >= ?");
    params.push(startDate);
  }

  if (endDate) {
    conditions.push("created_at <= ?");
    params.push(endDate);
  }

  const whereClause = conditions.join(" AND ");

  // Get total count
  const countResult = await db
    .prepare(`SELECT COUNT(*) as count FROM submissions WHERE ${whereClause}`)
    .bind(...params)
    .first();
  const total = Number(countResult?.count) || 0;

  // Get paginated results
  const result = await db
    .prepare(
      `
    SELECT * FROM submissions
    WHERE ${whereClause}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `
    )
    .bind(...params, limit, offset)
    .all();

  const submissions = (result.results || []).map(parseSubmission);

  return {
    data: submissions,
    pagination: {
      page,
      limit,
      total,
      has_more: offset + submissions.length < total,
    },
  };
}

/**
 * Get a single submission by ID
 */
export async function getSubmissionById(
  db: D1Database,
  formId: string,
  submissionId: string
): Promise<Submission | null> {
  const result = await db
    .prepare("SELECT * FROM submissions WHERE id = ? AND form_id = ?")
    .bind(submissionId, formId)
    .first();

  if (!result) return null;

  return parseSubmission(result);
}

/**
 * Update a submission (e.g., mark as read)
 */
export async function updateSubmission(
  db: D1Database,
  submissionId: string,
  updates: { is_read?: boolean }
): Promise<Submission> {
  const fields: string[] = [];
  const values: (string | number | boolean)[] = [];

  if (updates.is_read !== undefined) {
    fields.push("is_read = ?");
    values.push(updates.is_read ? 1 : 0);
  }

  if (fields.length === 0) {
    const existing = await db
      .prepare("SELECT * FROM submissions WHERE id = ?")
      .bind(submissionId)
      .first();
    return parseSubmission(existing!);
  }

  values.push(submissionId);

  await db
    .prepare(`UPDATE submissions SET ${fields.join(", ")} WHERE id = ?`)
    .bind(...values)
    .run();

  const updated = await db
    .prepare("SELECT * FROM submissions WHERE id = ?")
    .bind(submissionId)
    .first();

  return parseSubmission(updated!);
}

/**
 * Bulk update submissions
 */
export async function bulkUpdateSubmissions(
  db: D1Database,
  formId: string,
  ids: string[],
  updates: { is_read?: boolean }
): Promise<void> {
  if (ids.length === 0) return;

  const placeholders = ids.map(() => "?").join(", ");
  const isReadValue = updates.is_read ? 1 : 0;

  await db
    .prepare(
      `UPDATE submissions SET is_read = ? WHERE form_id = ? AND id IN (${placeholders})`
    )
    .bind(isReadValue, formId, ...ids)
    .run();
}

/**
 * Delete a submission
 */
export async function deleteSubmission(
  db: D1Database,
  submissionId: string
): Promise<void> {
  await db
    .prepare("DELETE FROM submissions WHERE id = ?")
    .bind(submissionId)
    .run();
}

/**
 * Bulk delete submissions
 */
export async function bulkDeleteSubmissions(
  db: D1Database,
  formId: string,
  ids: string[]
): Promise<void> {
  if (ids.length === 0) return;

  const placeholders = ids.map(() => "?").join(", ");

  await db
    .prepare(
      `DELETE FROM submissions WHERE form_id = ? AND id IN (${placeholders})`
    )
    .bind(formId, ...ids)
    .run();
}

// Helper functions

function parseForm(row: Record<string, unknown>): Form {
  return {
    id: row.id as string,
    email: row.email as string,
    email_hash: row.email_hash as string,
    verified_at: row.verified_at as string | null,
    settings: JSON.parse((row.settings as string) || "{}") as FormSettings,
    user_id: row.user_id as string | null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function parseSubmission(row: Record<string, unknown>): Submission {
  return {
    id: row.id as string,
    form_id: row.form_id as string,
    data: JSON.parse((row.data as string) || "{}") as Record<string, unknown>,
    ip_address: row.ip_address as string | null,
    user_agent: row.user_agent as string | null,
    spam_score: row.spam_score as number | null,
    is_spam: Boolean(row.is_spam),
    is_read: Boolean(row.is_read),
    created_at: row.created_at as string,
  };
}
