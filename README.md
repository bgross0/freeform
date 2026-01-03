# Freeform

A self-hosted form backend on Cloudflare Workers. Open-source FormSubmit alternative with full control over your data.

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

---

## Why Freeform?

- **Self-hosted** - Your data stays on your Cloudflare account
- **No vendor lock-in** - Open source, AGPL licensed
- **Edge-powered** - Runs on Cloudflare's global network
- **FormSubmit compatible** - Same API, easy migration
- **Free tier friendly** - Works entirely on Cloudflare's free tier

---

## Features

| Feature | Description |
|---------|-------------|
| **Email Notifications** | Instant delivery via Brevo/SendGrid |
| **Spam Protection** | Honeypot, reCAPTCHA v3, blacklist filtering |
| **Webhooks** | POST to any URL with HMAC signatures |
| **Rate Limiting** | Per-IP throttling to prevent abuse |
| **REST API** | Programmatic access to submissions |
| **Custom Redirects** | Send users to your own thank-you page |
| **AJAX Support** | JSON responses for SPAs |

---

## Quick Start

### 1. Deploy to Cloudflare

```bash
git clone https://github.com/bgross0/freeform.git
cd freeform
npm install

# Create resources
npx wrangler d1 create freeform-db
npx wrangler kv namespace create FREEFORM_KV
npx wrangler queues create freeform-email
npx wrangler queues create freeform-webhook

# Update wrangler.toml with IDs, then:
npx wrangler d1 migrations apply freeform-db --remote
npx wrangler secret put BREVO_API_KEY
npx wrangler deploy
```

### 2. Add to Your Site

```html
<form action="https://your-worker.workers.dev/submit" method="POST">
  <input type="text" name="_honeypot" style="display:none !important">
  <input type="hidden" name="_subject" value="New Contact Form">

  <input type="text" name="name" required>
  <input type="email" name="email" required>
  <textarea name="message" required></textarea>
  <button type="submit">Send</button>
</form>
```

### 3. Verify Your Email

First submission triggers a verification email. Click the link once, then all submissions flow through.

---

## Configuration

### Environment Variables

Set in `wrangler.toml`:

```toml
[vars]
FROM_EMAIL = "forms@yourdomain.com"  # Sender (must be verified in Brevo)
FROM_NAME = "Your Forms"              # Sender display name
TO_EMAIL = "you@yourdomain.com"       # Default recipient for /submit
```

### Secrets

```bash
npx wrangler secret put BREVO_API_KEY      # Required
npx wrangler secret put RECAPTCHA_SECRET_KEY  # Optional
npx wrangler secret put WEBHOOK_SECRET     # Optional
```

---

## Special Fields

Add hidden inputs to customize behavior:

| Field | Description |
|-------|-------------|
| `_honeypot` | Spam trap (leave empty, bots fill it) |
| `_next` | Redirect URL after submission |
| `_subject` | Custom email subject |
| `_cc` | CC recipients (comma-separated) |
| `_replyto` | Field name to use as reply-to |
| `_webhook` | URL to POST submission data |
| `_captcha` | reCAPTCHA v3 token |
| `_blacklist` | Phrases to block (comma-separated) |

---

## Spam Protection

### Honeypot (Recommended)

```html
<input type="text" name="_honeypot" style="display:none !important" tabindex="-1" autocomplete="off">
```

Bots fill hidden fields. If filled, submission is silently rejected.

### reCAPTCHA v3

```html
<script src="https://www.google.com/recaptcha/api.js?render=SITE_KEY"></script>
<input type="hidden" name="_captcha" id="captcha">
<script>
  grecaptcha.ready(() => {
    grecaptcha.execute('SITE_KEY', {action: 'submit'}).then(token => {
      document.getElementById('captcha').value = token;
    });
  });
</script>
```

---

## Webhooks

Send submissions to external services:

```html
<input type="hidden" name="_webhook" value="https://your-api.com/webhook">
```

**Payload:**

```json
{
  "form_data": { "name": "John", "email": "john@example.com" },
  "meta": { "form_id": "abc", "submission_id": "xyz", "submitted_at": "..." }
}
```

**Signature header:** `X-Freeform-Signature: t=timestamp,v1=hmac_hash`

---

## AJAX Submissions

```javascript
const res = await fetch('https://your-worker.workers.dev/submit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
  body: JSON.stringify({ name: 'John', email: 'john@example.com', message: 'Hello' })
});
const data = await res.json(); // { success: true, submission_id: "..." }
```

---

## API

Access submissions programmatically with API keys.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/forms/:id/submissions` | List submissions |
| `GET` | `/api/forms/:id/submissions/:sid` | Get submission |
| `PATCH` | `/api/forms/:id/submissions/:sid` | Mark read/unread |
| `DELETE` | `/api/forms/:id/submissions/:sid` | Delete submission |

```bash
curl -H "Authorization: Bearer ff_your_key" \
  https://your-worker.workers.dev/api/forms/ID/submissions
```

---

## Architecture

```
Browser → Cloudflare Worker → D1 (SQLite)
              ↓
         ┌────┴────┐
         ↓         ↓
        KV       Queue
     (tokens)   (email/webhook)
```

- **D1** - Form and submission storage
- **KV** - Rate limiting, verification tokens
- **Queues** - Async email/webhook delivery

---

## Local Development

```bash
# Copy env template
cp .dev.vars.example .dev.vars

# Run locally
npm run dev

# Apply migrations locally
npx wrangler d1 migrations apply freeform-db --local
```

---

## License

AGPL-3.0 - Free to use, modify, and self-host. If you modify and deploy as a service, you must open-source your changes.

---

Built with [Hono](https://hono.dev) + [Cloudflare Workers](https://workers.cloudflare.com)
