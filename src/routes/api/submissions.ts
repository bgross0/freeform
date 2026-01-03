/**
 * Submissions API for Freeform
 * REST endpoints for managing form submissions
 */

import { Hono } from "hono";
import type { Env } from "../../types/env.d";
import {
  getSubmission,
  getFormSubmissions,
  markSubmissionRead,
  deleteSubmission,
} from "../../services/submission";
// Form verification done via API key
import { apiAuthMiddleware } from "../../middleware/auth";
import { NotFoundError } from "../../middleware/error";

const submissionsRouter = new Hono<{ Bindings: Env }>();

// All routes require authentication
submissionsRouter.use("*", apiAuthMiddleware(["read"]));

/**
 * GET /api/forms/:formId/submissions
 * List submissions for a form
 */
submissionsRouter.get("/:formId/submissions", async (c) => {
  const formId = c.req.param("formId");
  const apiKeyData = c.get("apiKeyData") as { formId: string };

  // Verify API key matches requested form
  if (apiKeyData.formId !== formId) {
    return c.json(
      {
        error: "forbidden",
        code: "FORM_MISMATCH",
        message: "API key is not authorized for this form.",
      },
      403
    );
  }

  // Parse query parameters
  const page = parseInt(c.req.query("page") || "1");
  const limit = Math.min(parseInt(c.req.query("limit") || "50"), 100);
  const since = c.req.query("since") || undefined;
  const isRead = c.req.query("is_read");

  // Get submissions
  const { submissions, total } = await getFormSubmissions(c.env.DB, formId, {
    page,
    limit,
    since,
    isRead: isRead === "true" ? true : isRead === "false" ? false : undefined,
  });

  return c.json({
    data: submissions.map((s) => ({
      id: s.id,
      data: s.data,
      is_read: s.is_read,
      is_spam: s.is_spam,
      spam_score: s.spam_score,
      created_at: s.created_at,
    })),
    pagination: {
      page,
      limit,
      total,
      has_more: page * limit < total,
    },
  });
});

/**
 * GET /api/forms/:formId/submissions/:submissionId
 * Get a single submission
 */
submissionsRouter.get("/:formId/submissions/:submissionId", async (c) => {
  const formId = c.req.param("formId");
  const submissionId = c.req.param("submissionId");
  const apiKeyData = c.get("apiKeyData") as { formId: string };

  // Verify API key matches requested form
  if (apiKeyData.formId !== formId) {
    return c.json(
      {
        error: "forbidden",
        code: "FORM_MISMATCH",
        message: "API key is not authorized for this form.",
      },
      403
    );
  }

  const submission = await getSubmission(c.env.DB, submissionId);

  if (!submission || submission.form_id !== formId) {
    throw new NotFoundError("Submission");
  }

  return c.json({
    id: submission.id,
    data: submission.data,
    is_read: submission.is_read,
    is_spam: submission.is_spam,
    spam_score: submission.spam_score,
    ip_address: submission.ip_address,
    user_agent: submission.user_agent,
    created_at: submission.created_at,
  });
});

/**
 * PATCH /api/forms/:formId/submissions/:submissionId
 * Update submission (mark read/unread)
 */
submissionsRouter.patch("/:formId/submissions/:submissionId", async (c) => {
  const formId = c.req.param("formId");
  const submissionId = c.req.param("submissionId");
  const apiKeyData = c.get("apiKeyData") as { formId: string; permissions: string[] };

  // Check write permission
  if (!apiKeyData.permissions.includes("write")) {
    return c.json(
      {
        error: "forbidden",
        code: "INSUFFICIENT_PERMISSIONS",
        message: "API key lacks write permission.",
      },
      403
    );
  }

  // Verify API key matches requested form
  if (apiKeyData.formId !== formId) {
    return c.json(
      {
        error: "forbidden",
        code: "FORM_MISMATCH",
        message: "API key is not authorized for this form.",
      },
      403
    );
  }

  const submission = await getSubmission(c.env.DB, submissionId);

  if (!submission || submission.form_id !== formId) {
    throw new NotFoundError("Submission");
  }

  // Parse body
  const body = await c.req.json<{ is_read?: boolean }>();

  if (typeof body.is_read === "boolean") {
    await markSubmissionRead(c.env.DB, submissionId, body.is_read);
  }

  return c.json({ success: true });
});

/**
 * DELETE /api/forms/:formId/submissions/:submissionId
 * Delete a submission
 */
submissionsRouter.delete("/:formId/submissions/:submissionId", async (c) => {
  const formId = c.req.param("formId");
  const submissionId = c.req.param("submissionId");
  const apiKeyData = c.get("apiKeyData") as { formId: string; permissions: string[] };

  // Check delete permission
  if (!apiKeyData.permissions.includes("delete")) {
    return c.json(
      {
        error: "forbidden",
        code: "INSUFFICIENT_PERMISSIONS",
        message: "API key lacks delete permission.",
      },
      403
    );
  }

  // Verify API key matches requested form
  if (apiKeyData.formId !== formId) {
    return c.json(
      {
        error: "forbidden",
        code: "FORM_MISMATCH",
        message: "API key is not authorized for this form.",
      },
      403
    );
  }

  const submission = await getSubmission(c.env.DB, submissionId);

  if (!submission || submission.form_id !== formId) {
    throw new NotFoundError("Submission");
  }

  await deleteSubmission(c.env.DB, submissionId);

  return c.json({ success: true });
});

export { submissionsRouter };
