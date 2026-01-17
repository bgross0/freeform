// Form entity
export interface Form {
  id: string;
  email: string;
  email_hash: string;
  verified_at: string | null;
  settings: FormSettings;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface FormSettings {
  default_subject?: string;
  default_template?: "basic" | "table" | "minimal";
  recaptcha_enabled?: boolean;
  recaptcha_threshold?: number;
  allowed_origins?: string[];
  webhook_url?: string | null;
  cc_emails?: string[];
}

// Submission entity
export interface Submission {
  id: string;
  form_id: string;
  data: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  spam_score: number | null;
  is_spam: boolean;
  is_read: boolean;
  created_at: string;
}

// Webhook delivery entity
export interface WebhookDelivery {
  id: string;
  submission_id: string;
  url: string;
  status: "pending" | "success" | "failed";
  attempts: number;
  last_error: string | null;
  next_retry_at: string | null;
  created_at: string;
  updated_at: string;
}

// Special form fields (underscore-prefixed)
export interface SpecialFields {
  _replyto?: string;
  _next?: string;
  _subject?: string;
  _cc?: string;
  _blacklist?: string;
  _captcha?: string;
  _autoresponse?: string;
  _template?: "basic" | "table" | "minimal";
  _webhook?: string;
  _honeypot?: string;
  _gotcha?: string; // Common honeypot field name
}

// Marketing/attribution tracking parameters
export interface TrackingParams {
  // UTM parameters
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  // Google Ads
  gclid?: string;
  gbraid?: string; // Google app attribution (iOS)
  wbraid?: string; // Google web attribution (iOS)
  // Facebook/Meta
  fbclid?: string;
  // Microsoft Ads
  msclkid?: string;
  // TikTok
  ttclid?: string;
  // LinkedIn
  li_fat_id?: string;
  // Twitter/X
  twclid?: string;
  // Generic click ID
  dclid?: string; // DoubleClick
  // Landing page info
  landing_page?: string;
  referrer?: string;
}

// Parsed form data
export interface ParsedFormData {
  fields: Record<string, unknown>;
  specialFields: SpecialFields;
  tracking?: TrackingParams;
  files?: File[];
}

// Email attachment
export interface EmailAttachment {
  name: string;
  content: string; // base64 encoded
  contentType: string;
}

// Email message
export interface EmailMessage {
  to: string;
  from: string;
  fromName?: string;
  replyTo?: string;
  subject: string;
  html: string;
  text?: string;
  cc?: string[];
  attachments?: EmailAttachment[];
}

// Webhook payload
export interface WebhookPayload {
  form_data: Record<string, unknown>;
  meta: {
    form_id: string;
    submission_id: string;
    submitted_at: string;
    ip_address: string | null;
    tracking?: TrackingParams | null;
  };
}

// API responses
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    has_more: boolean;
  };
}

export interface ErrorResponse {
  error: string;
  code: string;
  message: string;
}

// Queue message types
export interface EmailQueueMessage {
  type: "submission" | "verification" | "autoresponse";
  to: string;
  form_id: string;
  submission_id?: string;
  data: Record<string, unknown>;
}

export interface WebhookQueueMessage {
  delivery_id: string;
  submission_id: string;
  url: string;
  payload: WebhookPayload;
  attempt: number;
}

// Dashboard session entity (stored in KV)
export interface DashboardSession {
  token: string;
  userId: string; // Always "admin" for v1
  createdAt: string;
  expiresAt: string;
}

// Form with submission counts (for dashboard)
export interface FormWithCounts extends Form {
  submission_count: number;
  unread_count: number;
  latest_submission_at: string | null;
}
