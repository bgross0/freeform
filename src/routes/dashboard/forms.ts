import { Hono } from "hono";
import type { Env } from "../../types/env.d";
import { getFormsWithCounts, getFormById, createForm, updateForm } from "../../services/dashboard-db";

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

// POST /dashboard/api/forms - Create a new form
formsRouter.post("/", async (c) => {
  try {
    const body = await c.req.json();

    if (!body.name || !body.email) {
      return c.json(
        {
          error: "validation_error",
          code: "MISSING_FIELDS",
          message: "Name and email are required",
        },
        400
      );
    }

    const form = await createForm(c.env.DB, {
      name: body.name,
      email: body.email,
    });

    return c.json({ data: form }, 201);
  } catch (error) {
    console.error("Error creating form:", error);
    return c.json(
      {
        error: "server_error",
        code: "CREATE_FAILED",
        message: "Failed to create form",
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

// PATCH /dashboard/api/forms/:id - Update form (name and/or settings)
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

    const updatedForm = await updateForm(c.env.DB, formId, body);
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
