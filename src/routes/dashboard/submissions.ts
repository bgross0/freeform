import { Hono } from "hono";
import type { Env } from "../../types/env.d";
import {
  getSubmissions,
  getSubmissionById,
  updateSubmission,
  deleteSubmission,
  bulkUpdateSubmissions,
  bulkDeleteSubmissions,
} from "../../services/dashboard-db";
import { generateCsv } from "../../utils/csv";

const submissionsRouter = new Hono<{ Bindings: Env }>();

// Helper to get and validate formId param
function getFormId(c: { req: { param: (name: string) => string | undefined } }): string {
  const formId = c.req.param("formId");
  if (!formId) throw new Error("formId is required");
  return formId;
}

// GET /dashboard/api/forms/:formId/submissions - List submissions with pagination
submissionsRouter.get("/", async (c) => {
  try {
    const formId = getFormId(c);
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "25");
    const search = c.req.query("search") || "";
    const startDate = c.req.query("startDate") || "";
    const endDate = c.req.query("endDate") || "";

    const result = await getSubmissions(c.env.DB, formId, {
      page,
      limit,
      search,
      startDate,
      endDate,
    });

    return c.json(result);
  } catch (error) {
    console.error("Error fetching submissions:", error);
    return c.json(
      {
        error: "server_error",
        code: "FETCH_FAILED",
        message: "Failed to fetch submissions",
      },
      500
    );
  }
});

// GET /dashboard/api/forms/:formId/submissions/export - Export as CSV
submissionsRouter.get("/export", async (c) => {
  try {
    const formId = getFormId(c);
    const search = c.req.query("search") || "";
    const startDate = c.req.query("startDate") || "";
    const endDate = c.req.query("endDate") || "";

    // Get all submissions matching filters (no pagination for export)
    const result = await getSubmissions(c.env.DB, formId, {
      page: 1,
      limit: 10000, // Reasonable max for export
      search,
      startDate,
      endDate,
    });

    const csv = generateCsv(result.data);

    const filename = `submissions-${formId}-${new Date().toISOString().split("T")[0]}.csv`;

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error exporting submissions:", error);
    return c.json(
      {
        error: "server_error",
        code: "EXPORT_FAILED",
        message: "Failed to export submissions",
      },
      500
    );
  }
});

// GET /dashboard/api/forms/:formId/submissions/:subId - Get single submission
submissionsRouter.get("/:subId", async (c) => {
  try {
    const formId = getFormId(c);
    const subId = c.req.param("subId") || "";

    const submission = await getSubmissionById(c.env.DB, formId, subId);

    if (!submission) {
      return c.json(
        {
          error: "not_found",
          code: "SUBMISSION_NOT_FOUND",
          message: "Submission not found",
        },
        404
      );
    }

    return c.json({ data: submission });
  } catch (error) {
    console.error("Error fetching submission:", error);
    return c.json(
      {
        error: "server_error",
        code: "FETCH_FAILED",
        message: "Failed to fetch submission",
      },
      500
    );
  }
});

// PATCH /dashboard/api/forms/:formId/submissions/bulk - Bulk update
submissionsRouter.patch("/bulk", async (c) => {
  try {
    const formId = getFormId(c);
    const body = await c.req.json();
    const { ids, is_read } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return c.json(
        {
          error: "invalid_request",
          code: "INVALID_IDS",
          message: "ids must be a non-empty array",
        },
        400
      );
    }

    if (typeof is_read !== "boolean") {
      return c.json(
        {
          error: "invalid_request",
          code: "INVALID_IS_READ",
          message: "is_read must be a boolean",
        },
        400
      );
    }

    await bulkUpdateSubmissions(c.env.DB, formId, ids, { is_read });

    return c.json({ success: true, updated: ids.length });
  } catch (error) {
    console.error("Error bulk updating submissions:", error);
    return c.json(
      {
        error: "server_error",
        code: "UPDATE_FAILED",
        message: "Failed to update submissions",
      },
      500
    );
  }
});

// PATCH /dashboard/api/forms/:formId/submissions/:subId - Update single submission
submissionsRouter.patch("/:subId", async (c) => {
  try {
    const formId = getFormId(c);
    const subId = c.req.param("subId") || "";
    const body = await c.req.json();

    const submission = await getSubmissionById(c.env.DB, formId, subId);
    if (!submission) {
      return c.json(
        {
          error: "not_found",
          code: "SUBMISSION_NOT_FOUND",
          message: "Submission not found",
        },
        404
      );
    }

    const updated = await updateSubmission(c.env.DB, subId, body);
    return c.json({ data: updated });
  } catch (error) {
    console.error("Error updating submission:", error);
    return c.json(
      {
        error: "server_error",
        code: "UPDATE_FAILED",
        message: "Failed to update submission",
      },
      500
    );
  }
});

// DELETE /dashboard/api/forms/:formId/submissions/bulk - Bulk delete
submissionsRouter.delete("/bulk", async (c) => {
  try {
    const formId = getFormId(c);
    const body = await c.req.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return c.json(
        {
          error: "invalid_request",
          code: "INVALID_IDS",
          message: "ids must be a non-empty array",
        },
        400
      );
    }

    await bulkDeleteSubmissions(c.env.DB, formId, ids);

    return c.json({ success: true, deleted: ids.length });
  } catch (error) {
    console.error("Error bulk deleting submissions:", error);
    return c.json(
      {
        error: "server_error",
        code: "DELETE_FAILED",
        message: "Failed to delete submissions",
      },
      500
    );
  }
});

// DELETE /dashboard/api/forms/:formId/submissions/:subId - Delete single submission
submissionsRouter.delete("/:subId", async (c) => {
  try {
    const formId = getFormId(c);
    const subId = c.req.param("subId") || "";

    const submission = await getSubmissionById(c.env.DB, formId, subId);
    if (!submission) {
      return c.json(
        {
          error: "not_found",
          code: "SUBMISSION_NOT_FOUND",
          message: "Submission not found",
        },
        404
      );
    }

    await deleteSubmission(c.env.DB, subId);

    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting submission:", error);
    return c.json(
      {
        error: "server_error",
        code: "DELETE_FAILED",
        message: "Failed to delete submission",
      },
      500
    );
  }
});

export { submissionsRouter };
