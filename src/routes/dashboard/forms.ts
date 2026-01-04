import { Hono } from "hono";
import type { Env } from "../../types/env.d";
import { getFormsWithCounts, getFormById, updateFormSettings } from "../../services/dashboard-db";

const formsRouter = new Hono<{ Bindings: Env }>();

// GET /dashboard/api/forms - List all forms with counts
formsRouter.get("/", async (c) => {
  try {
    const forms = await getFormsWithCounts(c.env.DB);
    return c.json({ data: forms });
  } catch (error) {
    console.error("Error fetching forms:", error);
    return c.json(
      {
        error: "server_error",
        code: "FETCH_FAILED",
        message: "Failed to fetch forms",
      },
      500
    );
  }
});

// GET /dashboard/api/forms/:id - Get single form
formsRouter.get("/:id", async (c) => {
  try {
    const formId = c.req.param("id");
    const form = await getFormById(c.env.DB, formId);

    if (!form) {
      return c.json(
        {
          error: "not_found",
          code: "FORM_NOT_FOUND",
          message: "Form not found",
        },
        404
      );
    }

    return c.json({ data: form });
  } catch (error) {
    console.error("Error fetching form:", error);
    return c.json(
      {
        error: "server_error",
        code: "FETCH_FAILED",
        message: "Failed to fetch form",
      },
      500
    );
  }
});

// PATCH /dashboard/api/forms/:id - Update form settings
formsRouter.patch("/:id", async (c) => {
  try {
    const formId = c.req.param("id");
    const body = await c.req.json();

    const form = await getFormById(c.env.DB, formId);
    if (!form) {
      return c.json(
        {
          error: "not_found",
          code: "FORM_NOT_FOUND",
          message: "Form not found",
        },
        404
      );
    }

    const updatedForm = await updateFormSettings(c.env.DB, formId, body);
    return c.json({ data: updatedForm });
  } catch (error) {
    console.error("Error updating form:", error);
    return c.json(
      {
        error: "server_error",
        code: "UPDATE_FAILED",
        message: "Failed to update form",
      },
      500
    );
  }
});

export { formsRouter };
