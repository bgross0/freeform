/// <reference types="@cloudflare/workers-types" />

export interface Env {
  // D1 Database
  DB: D1Database;

  // KV Namespace for rate limiting and tokens
  KV: KVNamespace;

  // R2 Bucket for file uploads (optional)
  FILES?: R2Bucket;

  // Queues
  EMAIL_QUEUE: Queue;
  WEBHOOK_QUEUE: Queue;

  // Environment variables
  ENVIRONMENT: string;
  FROM_EMAIL: string;
  FROM_NAME: string;
  TO_EMAIL: string;

  // Secrets (set via wrangler secret)
  BREVO_API_KEY?: string;
  RECAPTCHA_SECRET_KEY?: string;
  ADMIN_API_KEY?: string;
  WEBHOOK_SECRET?: string;
}

// API key data stored in context
interface ApiKeyData {
  formId: string;
  email: string;
  permissions: ("read" | "write" | "delete")[];
  createdAt: string;
}

// Hono context with environment bindings
declare module "hono" {
  interface ContextVariableMap {
    apiKeyData: ApiKeyData;
  }
}
