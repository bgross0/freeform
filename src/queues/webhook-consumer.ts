/**
 * Webhook queue consumer for Freeform
 * Processes webhook delivery jobs from the queue
 */

import type { Env } from "../types/env.d";
import type { WebhookQueueMessage } from "../types";
import { deliverWebhook, markWebhookFailed } from "../services/webhook";
import {
  shouldRetry,
  createRetryMessage,
  formatRetryInfo,
  calculateRetryDelay,
} from "../services/webhook-retry";

/**
 * Process a batch of webhook messages
 */
export async function processWebhookBatch(
  batch: MessageBatch<unknown>,
  env: Env
): Promise<void> {
  for (const message of batch.messages) {
    try {
      await processWebhookMessage(message.body as WebhookQueueMessage, env);
      message.ack();
    } catch (error) {
      console.error("Failed to process webhook message:", error);
      // Retry the message
      message.retry();
    }
  }
}

/**
 * Process a single webhook message
 */
async function processWebhookMessage(
  msg: WebhookQueueMessage,
  env: Env
): Promise<void> {
  const { delivery_id, url, payload, attempt } = msg;

  console.log(`Processing webhook ${delivery_id} (attempt ${attempt})`);

  // Attempt delivery
  const result = await deliverWebhook(env, delivery_id, url, payload, attempt);

  if (result.success) {
    console.log(`Webhook ${delivery_id} delivered successfully`);
    return;
  }

  // Delivery failed - check if we should retry
  const error = result.error || "Unknown error";
  console.log(formatRetryInfo(delivery_id, attempt, error));

  if (shouldRetry(attempt)) {
    // Queue retry with delay
    const retryMessage = createRetryMessage(msg, attempt + 1);
    const delaySeconds = calculateRetryDelay(attempt + 1);

    await env.WEBHOOK_QUEUE.send(retryMessage, {
      delaySeconds,
    });
  } else {
    // Max retries reached - mark as failed
    await markWebhookFailed(env.DB, delivery_id, error);
    console.error(`Webhook ${delivery_id} failed after ${attempt} attempts`);
  }
}

/**
 * Export queue handler for wrangler
 */
export default {
  async queue(
    batch: MessageBatch<WebhookQueueMessage>,
    env: Env
  ): Promise<void> {
    await processWebhookBatch(batch, env);
  },
};
