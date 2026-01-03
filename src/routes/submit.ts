/**
 * Form submission route for Freeform
 * POST /{target} - Accept form submissions
 */

import { Hono } from "hono";
import type { Env } from "../types/env.d";
import { parseFormData, getSubmitterEmail } from "../utils/parse-form";
import { resolveForm, isFormVerified } from "../services/form";
import { createSubmission, formatSubmissionData } from "../services/submission";
import { createVerificationToken, sendVerificationEmail } from "../services/verification";
import { sendSubmissionEmail } from "../services/email";
import { thankYouPage, redirect, htmlResponse } from "../utils/response";
import { validateRedirectUrl } from "../utils/validate-url";
import { queueWebhook } from "../services/webhook";
import { checkSpam, quickSpamCheck } from "../services/spam";
import { NotFoundError } from "../middleware/error";

const submitRouter = new Hono<{ Bindings: Env }>();

/**
 * Handle form submission
 * Target can be: "submit" (uses TO_EMAIL env var), email, email hash, or form ID
 */
submitRouter.post("/:target", async (c) => {
  let target = c.req.param("target");

  // Use default recipient if target is "submit"
  if (target === "submit") {
    target = c.env.TO_EMAIL;
  }

  // Parse form data
  const formData = await parseFormData(c);

  // Quick spam check (honeypot) - reject immediately
  if (quickSpamCheck(formData)) {
    // Return success to not reveal spam detection
    return c.json({ success: true, message: "Form submitted successfully" });
  }

  // Resolve form from target
  const result = await resolveForm(c.env.DB, target);
  if (!result) {
    throw new NotFoundError("Form");
  }

  const { form } = result;

  // Get client info
  const ipAddress = c.req.header("CF-Connecting-IP") ||
                    c.req.header("X-Forwarded-For")?.split(",")[0] ||
                    null;
  const userAgent = c.req.header("User-Agent") || null;

  // Full spam check (reCAPTCHA, blacklist, etc.)
  const spamResult = await checkSpam(
    c.env,
    formData,
    ipAddress,
    form.settings.recaptcha_threshold
  );

  // Create submission with spam data
  const submission = await createSubmission(c.env.DB, form.id, formData, {
    ipAddress,
    userAgent,
    spamScore: spamResult.score,
    isSpam: spamResult.isSpam,
  });

  // If spam, silently accept but don't process
  if (spamResult.isSpam) {
    console.log("Spam submission blocked:", spamResult.reasons);
    return c.json({ success: true, message: "Form submitted successfully" });
  }

  // Handle unverified form
  if (!isFormVerified(form)) {
    // Create verification token and send email
    const token = await createVerificationToken(c.env.KV, form.email, submission.id, formData);

    // Send verification email
    const verifyUrl = new URL(`/verify/${token}`, c.req.url).toString();
    await sendVerificationEmail(c.env, form.email, verifyUrl);

    // Return thank-you page with verification notice
    return htmlResponse(c, verificationPendingPage(form.email));
  }

  // Form is verified - send notification email
  const submitterEmail = getSubmitterEmail(formData);
  await sendSubmissionEmail(c.env, {
    to: form.email,
    replyTo: submitterEmail,
    subject: formData.specialFields._subject || form.settings.default_subject || "New form submission",
    data: formatSubmissionData(submission),
    template: formData.specialFields._template || form.settings.default_template,
    cc: formData.specialFields._cc,
  });

  // Queue webhook delivery if configured
  const webhookUrl = formData.specialFields._webhook || form.settings.webhook_url;
  if (webhookUrl) {
    await queueWebhook(c.env, submission, webhookUrl);
  }

  // Handle redirect or thank-you page
  if (formData.specialFields._next) {
    const validatedUrl = validateRedirectUrl(formData.specialFields._next);
    if (validatedUrl) {
      return redirect(c, validatedUrl);
    }
    // Invalid URL - fall through to thank-you page
    console.warn("Invalid _next URL rejected:", formData.specialFields._next);
  }

  // Check if AJAX request - only if explicitly requesting JSON
  const acceptHeader = c.req.header("Accept") || "";
  const isAjax =
    c.req.header("X-Requested-With") === "XMLHttpRequest" ||
    (acceptHeader.includes("application/json") && !acceptHeader.includes("text/html"));

  if (isAjax) {
    return c.json({
      success: true,
      message: "Form submitted successfully",
      submission_id: submission.id,
    });
  }

  return htmlResponse(c, thankYouPage(form.email));
});

/**
 * Verification pending page HTML
 */
function verificationPendingPage(email: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Check Your Email | Freeform</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #fff;
      color: #333;
      padding: 20px;
    }
    .container { max-width: 500px; }
    h1 { font-size: 1.5rem; margin-bottom: 1rem; color: #333; }
    p { line-height: 1.6; margin-bottom: 1rem; color: #666; }
    .email { font-weight: 600; color: #333; }
    .footer { margin-top: 2rem; font-size: 0.8rem; color: #999; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Check Your Email</h1>
    <p>We've sent a verification link to <span class="email">${email}</span></p>
    <p>Click the link to start receiving form submissions.</p>
    <p class="footer">Freeform</p>
  </div>
</body>
</html>`;
}

export { submitRouter };
