/**
 * API routes index for Freeform
 */

import { Hono } from "hono";
import type { Env } from "../../types/env.d";
import { formsRouter } from "./forms";
import { submissionsRouter } from "./submissions";

const apiRouter = new Hono<{ Bindings: Env }>();

// Mount routes
apiRouter.route("/forms", formsRouter);
apiRouter.route("/forms", submissionsRouter);

// API info endpoint
apiRouter.get("/", (c) => {
  return c.json({
    name: "Freeform API",
    version: "1.0.0",
    documentation: "https://github.com/your-org/freeform#api",
    endpoints: {
      forms: {
        get: "GET /api/forms/:formId",
        update: "PATCH /api/forms/:formId",
      },
      submissions: {
        list: "GET /api/forms/:formId/submissions",
        get: "GET /api/forms/:formId/submissions/:id",
        update: "PATCH /api/forms/:formId/submissions/:id",
        delete: "DELETE /api/forms/:formId/submissions/:id",
      },
    },
  });
});

export { apiRouter };
