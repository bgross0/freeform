/**
 * Webhook service for Freeform
 * Handles webhook delivery and tracking
 */

import type { D1Database } from "@cloudflare/workers-types";
import type { WebhookDelivery, WebhookPayload, Submission } from "../types";
import type { Env } from "../types/env.d";
import { generateUUID } from "../utils/crypto";
import { generateWebhookSignature } from "../utils/signature";
import {
  createWebhookDelivery as dbCreateWebhookDelivery,
  updateWebhookDelivery,
  getWebhookDeliveryById,
} from "./db";

/**
 * Create a webhook delivery record and queue it for processing
 */
export async function queueWebhookDelivery(
  env: Env,
  submission: Submission,
  webhookUrl: string
): Promise<WebhookDelivery> {
  // Create delivery record
  const delivery: Omit<WebhookDelivery, "created_at" | "updated_at"> = {
    id: generateUUID(),
    submission_id: submission.id,
    url: webhookUrl,
    status: "pending",
    attempts: 0,
    last_error: null,
    next_retry_at: null,
  };

  const created = await dbCreateWebhookDelivery(env.DB, delivery);

  // Extract tracking from submission metadata
  const submissionMeta = submission.data._meta as { tracking?: Record<string, string> | null } | undefined;
  const tracking = submissionMeta?.tracking ?? null;

  // Build payload
  const payload: WebhookPayload = {
    form_data: submission.data,
    meta: {
      form_id: submission.form_id,
      submission_id: submission.id,
      submitted_at: submission.created_at,
      ip_address: submission.ip_address,
      tracking,
    },
  };

  // Queue for delivery
  await env.WEBHOOK_QUEUE.send({
    delivery_id: created.id,
    submission_id: submission.id,
    url: webhookUrl,
    payload,
    attempt: 1,
  });

  return created;
}

/**
 * Deliver a webhook
 * Returns true if successful, false otherwise
 */
export async function deliverWebhook(
  env: Env,
  deliveryId: string,
  url: string,
  payload: WebhookPayload,
  attempt: number
): Promise<{ success: boolean; error?: string }> {
  const payloadJson = JSON.stringify(payload);

  // Generate signature
  const secret = env.WEBHOOK_SECRET || "default-webhook-secret";
  const signature = await generateWebhookSignature(payloadJson, secret);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Freeform-Signature": signature,
        "X-Freeform-Delivery": deliveryId,
        "User-Agent": "Freeform-Webhook/1.0",
      },
      body: payloadJson,
    });

    if (response.ok) {
      // Mark as successful
      await updateWebhookDelivery(env.DB, deliveryId, {
        status: "success",
        attempts: attempt,
        last_error: null,
      });
      return { success: true };
    }

    // Non-2xx response
    const errorText = await response.text().catch(() => "Unknown error");
    const error = `HTTP ${response.status}: ${errorText.slice(0, 200)}`;

    await updateWebhookDelivery(env.DB, deliveryId, {
      attempts: attempt,
      last_error: error,
    });

    return { success: false, error };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";

    await updateWebhookDelivery(env.DB, deliveryId, {
      attempts: attempt,
      last_error: error,
    });

    return { success: false, error };
  }
}

/**
 * Mark webhook as failed after all retries exhausted
 */
export async function markWebhookFailed(
  db: D1Database,
  deliveryId: string,
  error: string
): Promise<void> {
  await updateWebhookDelivery(db, deliveryId, {
    status: "failed",
    last_error: error,
  });
}

/**
 * Get webhook delivery status
 */
export async function getWebhookStatus(
  db: D1Database,
  deliveryId: string
): Promise<WebhookDelivery | null> {
  return getWebhookDeliveryById(db, deliveryId);
}

// Alias for submit route
export const queueWebhook = queueWebhookDelivery;
