import { Hono } from "hono";
import type { Env } from "../../types/env.d";
import { dashboardAuthMiddleware } from "../../middleware/dashboard-auth";
import { authRouter } from "./auth";
import { formsRouter } from "./forms";
import { submissionsRouter } from "./submissions";

const dashboardRouter = new Hono<{ Bindings: Env }>();

// Mount auth routes (no auth required for login)
dashboardRouter.route("/api/auth", authRouter);

// Protected routes - require authentication
dashboardRouter.use("/api/*", dashboardAuthMiddleware);
dashboardRouter.route("/api/forms", formsRouter);

// Submissions are nested under forms
dashboardRouter.route("/api/forms/:formId/submissions", submissionsRouter);

// Serve static dashboard assets (will be configured separately)
// The Worker will serve from dashboard/dist for non-API routes

export { dashboardRouter };
