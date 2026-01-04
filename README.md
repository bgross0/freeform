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

## Quick Start

### 1. Deploy to Cloudflare

```bash
git clone https://github.com/bgross0/freeform.git
cd freeform
npm install
npm run setup   # Creates all resources, prompts for config
npm run deploy
```

### 2. Add to Your Site

```html
<form action="https://your-worker.workers.dev/submit" method="POST">
  <input type="text" name="name" required>
  <input type="email" name="email" required>
  <textarea name="message" required></textarea>
  <button type="submit">Send</button>
</form>
```

### 3. Verify Your Email

First submission triggers a verification email. Click the link once, then all submissions flow through.

---

## Features

| Feature | Description |
|---------|-------------|
| **Email Notifications** | Instant delivery via Brevo/SendGrid |
| **Spam Protection** | Honeypot, reCAPTCHA v3, blacklist filtering |
| **Webhooks** | POST to any URL with HMAC signatures |
| **File Uploads** | Attach files up to 5MB total |
| **Auto-response** | Send confirmation emails to submitters |
| **Email Templates** | Choose from basic, table, or minimal styles |
| **Rate Limiting** | Per-IP throttling to prevent abuse |
| **REST API** | Programmatic access to submissions |
| **AJAX Support** | JSON responses for SPAs |

---

## Special Form Fields

Add hidden inputs to customize behavior:

### `_replyto`
Sets the Reply-To header so you can respond directly to the person who submitted.

```html
<input type="email" name="email" placeholder="Your email">
```
> The `email` field is automatically used as reply-to.

### `_next`
Redirect users to a custom thank-you page after submission.

```html
<input type="hidden" name="_next" value="https://yoursite.com/thanks">
```

### `_subject`
Customize the email subject line.

```html
<input type="hidden" name="_subject" value="New Contact Form Submission">
```

### `_cc`
Send copies to additional email addresses (comma-separated).

```html
<input type="hidden" name="_cc" value="sales@company.com,support@company.com">
```

### `_blacklist`
Block submissions containing specific phrases (comma-separated).

```html
<input type="hidden" name="_blacklist" value="viagra, casino, crypto investment">
```

### `_captcha`
Disable reCAPTCHA for this form.

```html
<input type="hidden" name="_captcha" value="false">
```

### `_honeypot` / `_honey`
Add a spam trap field. If filled (by bots), submission is silently rejected.

```html
<input type="text" name="_honeypot" style="display:none !important">
```

### `_autoresponse`
Send an automatic confirmation email to the submitter with a custom message.

```html
<input type="hidden" name="_autoresponse" value="Thanks for reaching out! We'll get back to you within 24 hours.">
```
> Requires an `email` field in your form.

### `_template`
Choose an email template style: `basic`, `table`, or `minimal`.

```html
<input type="hidden" name="_template" value="table">
```

### `_webhook`
POST submission data to an external URL in real-time.

```html
<input type="hidden" name="_webhook" value="https://your-api.com/webhook">
```

---

## File Uploads

Upload files with your form submissions. Files are attached to the notification email.

```html
<form action="https://your-worker.workers.dev/submit" method="POST" enctype="multipart/form-data">
  <input type="text" name="name" required>
  <input type="email" name="email" required>
  <input type="file" name="attachment" accept="image/*,.pdf">
  <button type="submit">Send</button>
</form>
```

**Limits:**
- Maximum 5MB total for all files
- Multiple file inputs supported
- Files are attached to email, not stored permanently

---

## AJAX Submissions

Submit forms via JavaScript without page reload:

```javascript
const response = await fetch('https://your-worker.workers.dev/submit', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  body: JSON.stringify({
    name: 'John Doe',
    email: 'john@example.com',
    message: 'Hello!'
  })
});

const result = await response.json();
// { success: true, submission_id: "abc123" }
```

---

## Webhooks

Receive real-time notifications when forms are submitted.

### Payload Format

```json
{
  "form_data": {
    "name": "John Doe",
    "email": "john@example.com",
    "message": "Hello!"
  },
  "meta": {
    "form_id": "abc-123",
    "submission_id": "xyz-789",
    "submitted_at": "2024-01-15T10:30:00Z",
    "ip_address": "192.168.1.1"
  }
}
```

### Verification

Each webhook request includes a signature header for verification:

```
X-Freeform-Signature: <hmac-sha256>
X-Freeform-Delivery: <delivery-id>
```

---

## Spam Protection

### Honeypot (Recommended)

Add a hidden field that only bots will fill:

```html
<input type="text" name="_honeypot" style="display:none !important" tabindex="-1" autocomplete="off">
```

### Blacklist

Block specific phrases:

```html
<input type="hidden" name="_blacklist" value="bitcoin, lottery, wire transfer">
```

### reCAPTCHA v3

```html
<script src="https://www.google.com/recaptcha/api.js?render=YOUR_SITE_KEY"></script>
<script>
  grecaptcha.ready(() => {
    grecaptcha.execute('YOUR_SITE_KEY', {action: 'submit'}).then(token => {
      document.getElementById('captcha').value = token;
    });
  });
</script>
<input type="hidden" name="_captcha" id="captcha">
```

---

## API Access

Access your form submissions programmatically.

### Get Your API Key

Request an API key via email:

```bash
curl https://your-worker.workers.dev/api/get-apikey/your@email.com
```

You'll receive an email with your API key.

### Get Submissions (Simple)

```bash
curl https://your-worker.workers.dev/api/get-submissions/YOUR_API_KEY
```

**Response:**

```json
{
  "success": true,
  "submissions": [
    {
      "form_data": { "name": "John", "email": "john@example.com" },
      "submitted_at": { "date": "2024-01-15T10:30:00Z", "timezone": "UTC" }
    }
  ]
}
```

### Full API

For more control, use the authenticated API:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/forms/:formId` | Get form details |
| `PATCH` | `/api/forms/:formId` | Update form settings |
| `GET` | `/api/forms/:formId/submissions` | List all submissions |
| `GET` | `/api/forms/:formId/submissions/:id` | Get single submission |
| `PATCH` | `/api/forms/:formId/submissions/:id` | Update submission |
| `DELETE` | `/api/forms/:formId/submissions/:id` | Delete submission |

**Authentication:**

```bash
curl https://your-worker.workers.dev/api/forms/FORM_ID/submissions \
  -H "Authorization: Bearer YOUR_API_KEY"
```

---

## Dashboard

Freeform includes a built-in dashboard for managing forms and submissions.

**Access:** `https://your-worker.workers.dev/dashboard/`

### Features

- **Forms Overview** - See all forms with submission counts
- **Submissions Table** - Browse, search, and filter submissions
- **Bulk Actions** - Mark read/unread, delete multiple submissions
- **Export to CSV** - Download submissions with current filters
- **Form Settings** - Configure email, webhooks, and notifications
- **Dark Mode** - System-aware theme with manual toggle
- **Responsive** - Works on desktop and tablet

### Setup

Set dashboard credentials as Wrangler secrets:

```bash
# Set username
echo "your-username" | npx wrangler secret put DASHBOARD_USER

# Set password (generate a strong one)
openssl rand -base64 24 | npx wrangler secret put DASHBOARD_PASS
```

### Login

Navigate to `/dashboard/` and enter your credentials. Sessions are stored in cookies and last 7 days.

---

## Invisible Emails

Hide your email address from spam bots by using your form's hash:

```html
<form action="https://your-worker.workers.dev/f/abc123def456..." method="POST">
```

The hash is displayed after you verify your email.

---

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `FROM_EMAIL` | Yes | Sender email (must be verified in Brevo) |
| `FROM_NAME` | Yes | Sender display name |
| `TO_EMAIL` | Yes | Default recipient for `/submit` endpoint |
| `BREVO_API_KEY` | Yes | API key from [Brevo](https://app.brevo.com) |
| `RECAPTCHA_SECRET_KEY` | No | For reCAPTCHA v3 verification |
| `WEBHOOK_SECRET` | No | For webhook signature generation |

### Setup

```bash
npm run setup
```

The setup script handles:
- D1 database creation
- KV namespace creation
- Queue creation
- Database migrations
- Secrets configuration
- `wrangler.toml` generation

---

## Local Development

```bash
# Run setup first
npm run setup

# Copy env template
cp .dev.vars.example .dev.vars
# Edit .dev.vars with your secrets

# Apply migrations locally
npx wrangler d1 migrations apply freeform-db --local

# Run locally
npm run dev
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
- **KV** - Rate limiting, verification tokens, API keys
- **Queues** - Async email/webhook delivery

---

## Migrating from FormSubmit

Freeform is API-compatible with FormSubmit. Just change the form action URL:

```html
<!-- Before (FormSubmit) -->
<form action="https://formsubmit.co/your@email.com" method="POST">

<!-- After (Freeform) -->
<form action="https://your-worker.workers.dev/submit" method="POST">
```

All special fields (`_next`, `_subject`, `_cc`, etc.) work the same way.

---

## License

AGPL-3.0 - Free to use, modify, and self-host. If you modify and deploy as a service, you must open-source your changes.

---

Built with [Hono](https://hono.dev) + [Cloudflare Workers](https://workers.cloudflare.com)
