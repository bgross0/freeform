/**
 * Email service for Freeform
 * Uses Brevo (formerly Sendinblue) for transactional emails
 */

import type { Env } from "../types/env.d";
import type { EmailMessage } from "../types";
import { submissionEmailHtml } from "../utils/response";
import { parseCcEmails } from "../utils/parse-form";

/**
 * Email provider interface
 */
interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}

/**
 * Brevo (Sendinblue) email provider
 * API docs: https://developers.brevo.com/reference/sendtransacemail
 */
class BrevoProvider implements EmailProvider {
  constructor(private apiKey: string) {}

  async send(message: EmailMessage): Promise<void> {
    const payload: Record<string, unknown> = {
      sender: {
        name: message.fromName || "Freeform",
        email: message.from,
      },
      to: [{ email: message.to }],
      subject: message.subject,
      htmlContent: message.html,
    };

    // Add text content if provided
    if (message.text) {
      payload.textContent = message.text;
    }

    // Add reply-to if provided
    if (message.replyTo) {
      payload.replyTo = { email: message.replyTo };
    }

    // Add CC recipients if provided
    if (message.cc && message.cc.length > 0) {
      payload.cc = message.cc.map((email) => ({ email }));
    }

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": this.apiKey,
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Brevo API error (${response.status}): ${error}`);
    }
  }
}

/**
 * Get the email provider based on environment configuration
 */
function getEmailProvider(env: Env): EmailProvider | null {
  if (env.BREVO_API_KEY) {
    return new BrevoProvider(env.BREVO_API_KEY);
  }
  return null;
}

/**
 * Send an email using the configured provider
 */
export async function sendEmail(env: Env, message: EmailMessage): Promise<void> {
  const provider = getEmailProvider(env);
  if (!provider) {
    console.warn("No email provider configured (BREVO_API_KEY missing) - email not sent");
    return;
  }

  try {
    await provider.send(message);
  } catch (error) {
    console.error("Failed to send email:", error);
    throw error;
  }
}

/**
 * Send a form submission notification email
 */
export async function sendSubmissionEmail(
  env: Env,
  options: {
    to: string;
    replyTo?: string;
    subject: string;
    data: Record<string, unknown>;
    template?: "basic" | "table" | "minimal";
    cc?: string;
  }
): Promise<void> {
  const html = submissionEmailHtml(options.data, options.template || "basic");
  const ccEmails = parseCcEmails(options.cc);

  await sendEmail(env, {
    to: options.to,
    from: env.FROM_EMAIL,
    fromName: env.FROM_NAME,
    replyTo: options.replyTo,
    subject: options.subject,
    html,
    cc: ccEmails.length > 0 ? ccEmails : undefined,
  });
}

/**
 * Send auto-response email to form submitter
 */
export async function sendAutoResponse(
  env: Env,
  options: {
    to: string;
    subject: string;
    message: string;
    formEmail: string;
  }
): Promise<void> {
  const html = `<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; padding: 20px; max-width: 600px;">
  <h2>Thank you for your submission</h2>
  <p>${options.message}</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  <p style="color: #999; font-size: 12px;">This is an automated response.</p>
</body>
</html>`;

  await sendEmail(env, {
    to: options.to,
    from: env.FROM_EMAIL,
    fromName: env.FROM_NAME,
    replyTo: options.formEmail,
    subject: options.subject,
    html,
  });
}
