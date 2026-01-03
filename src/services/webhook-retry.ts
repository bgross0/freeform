/**
 * Webhook retry logic for Freeform
 * Implements exponential backoff for failed webhooks
 */

import type { WebhookQueueMessage } from "../types";

// Maximum number of retry attempts
export const MAX_RETRY_ATTEMPTS = 5;

// Base delay in seconds for exponential backoff
const BASE_DELAY_SECONDS = 1;

/**
 * Calculate delay for next retry using exponential backoff
 * Delays: 1s, 2s, 4s, 8s, 16s
 */
export function calculateRetryDelay(attempt: number): number {
  return BASE_DELAY_SECONDS * Math.pow(2, attempt - 1);
}

/**
 * Calculate next retry timestamp
 */
export function getNextRetryTime(attempt: number): string {
  const delaySeconds = calculateRetryDelay(attempt);
  const nextRetry = new Date(Date.now() + delaySeconds * 1000);
  return nextRetry.toISOString();
}

/**
 * Check if we should retry based on attempt count
 */
export function shouldRetry(attempt: number): boolean {
  return attempt < MAX_RETRY_ATTEMPTS;
}

/**
 * Create retry message for queue
 */
export function createRetryMessage(
  original: WebhookQueueMessage,
  nextAttempt: number
): WebhookQueueMessage {
  return {
    ...original,
    attempt: nextAttempt,
  };
}

/**
 * Format retry info for logging
 */
export function formatRetryInfo(
  deliveryId: string,
  attempt: number,
  error: string
): string {
  const nextDelay = calculateRetryDelay(attempt + 1);
  const remaining = MAX_RETRY_ATTEMPTS - attempt;
  return `Webhook ${deliveryId} failed (attempt ${attempt}/${MAX_RETRY_ATTEMPTS}): ${error}. ` +
         `${remaining > 0 ? `Retrying in ${nextDelay}s` : 'No more retries'}`;
}
