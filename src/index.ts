import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./types/env.d";
import { submitRouter } from "./routes/submit";
import { verifyRouter } from "./routes/verify";
import { apiRouter } from "./routes/api";
import { errorMiddleware } from "./middleware/error";
import { rateLimitMiddleware } from "./middleware/rate-limit";
import { processWebhookBatch } from "./queues/webhook-consumer";

const app = new Hono<{ Bindings: Env }>();

// Global CORS - allow cross-origin form submissions
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-API-Key", "X-Requested-With"],
    exposeHeaders: ["X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset", "Retry-After"],
    maxAge: 86400,
  })
);

// Error handling middleware
app.use("*", errorMiddleware);

// Health check endpoint (no rate limit)
app.get("/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "0.1.0",
  });
});

// Root info endpoint (no rate limit)
app.get("/", (c) => {
  return c.json({
    name: "Freeform",
    description: "Self-hosted form backend on Cloudflare Workers",
    version: "0.1.0",
    docs: "https://github.com/yourusername/freeform",
    health: "/health",
    api: "/api",
  });
});

// Mount API routes
app.route("/api", apiRouter);

// Mount verification route
app.route("/verify", verifyRouter);

// Rate limit form submissions
app.use("/:target", rateLimitMiddleware(10));

// Mount form submission route (must be last - catches all paths)
app.route("/", submitRouter);

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      error: "not_found",
      code: "NOT_FOUND",
      message: "The requested resource was not found",
    },
    404
  );
});

// Global error handler
app.onError((err, c) => {
  console.error("Unhandled error:", err);
  return c.json(
    {
      error: "internal_error",
      code: "INTERNAL_ERROR",
      message:
        c.env.ENVIRONMENT === "development"
          ? err.message
          : "An unexpected error occurred",
    },
    500
  );
});

// Export worker with queue handlers
export default {
  fetch: app.fetch,

  // Email queue consumer (placeholder - emails sent synchronously for now)
  async queue(batch: MessageBatch<unknown>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      try {
        // Check which queue this is from based on message content
        const data = message.body as Record<string, unknown>;

        if (data.delivery_id) {
          // Webhook queue message
          await processWebhookBatch(batch as MessageBatch<unknown>, env);
          return;
        }

        // Email queue - currently handled synchronously in submit flow
        console.log("Email queue message:", data);
        message.ack();
      } catch (error) {
        console.error("Queue processing error:", error);
        message.retry();
      }
    }
  },
};
