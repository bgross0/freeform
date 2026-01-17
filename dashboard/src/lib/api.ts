/**
 * API client for dashboard endpoints
 */

const API_BASE = "/dashboard/api";

interface ApiError {
  error: string;
  code: string;
  message: string;
}

class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      credentials: "include", // Include cookies for session
    });

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        error: "unknown",
        code: "UNKNOWN_ERROR",
        message: response.statusText,
      }));
      throw new ApiError(error.code, error.message, response.status);
    }

    // Handle empty responses
    const text = await response.text();
    if (!text) return {} as T;

    return JSON.parse(text);
  }

  // Auth endpoints
  async login(username: string, password: string) {
    return this.request<{ success: boolean; user: { id: string; username: string }; expiresAt: string }>(
      "/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ username, password }),
      }
    );
  }

  async logout() {
    return this.request<{ success: boolean }>("/auth/logout", {
      method: "POST",
    });
  }

  async getMe() {
    return this.request<{ user: { id: string; username: string }; expiresAt: string }>(
      "/auth/me"
    );
  }

  // Forms endpoints
  async getForms() {
    return this.request<{ data: FormWithCounts[] }>("/forms");
  }

  async getForm(id: string) {
    return this.request<{ data: Form }>(`/forms/${id}`);
  }

  async updateForm(id: string, settings: Partial<FormSettings>) {
    return this.request<{ data: Form }>(`/forms/${id}`, {
      method: "PATCH",
      body: JSON.stringify(settings),
    });
  }

  // Submissions endpoints
  async getSubmissions(formId: string, params: SubmissionParams = {}) {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set("page", String(params.page));
    if (params.limit) searchParams.set("limit", String(params.limit));
    if (params.search) searchParams.set("search", params.search);
    if (params.startDate) searchParams.set("startDate", params.startDate);
    if (params.endDate) searchParams.set("endDate", params.endDate);

    const query = searchParams.toString();
    return this.request<PaginatedResponse<Submission>>(
      `/forms/${formId}/submissions${query ? `?${query}` : ""}`
    );
  }

  async getSubmission(formId: string, submissionId: string) {
    return this.request<{ data: Submission }>(
      `/forms/${formId}/submissions/${submissionId}`
    );
  }

  async updateSubmission(formId: string, submissionId: string, data: { is_read?: boolean }) {
    return this.request<{ data: Submission }>(
      `/forms/${formId}/submissions/${submissionId}`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      }
    );
  }

  async deleteSubmission(formId: string, submissionId: string) {
    return this.request<{ success: boolean }>(
      `/forms/${formId}/submissions/${submissionId}`,
      { method: "DELETE" }
    );
  }

  async bulkUpdateSubmissions(formId: string, ids: string[], is_read: boolean) {
    return this.request<{ success: boolean; updated: number }>(
      `/forms/${formId}/submissions/bulk`,
      {
        method: "PATCH",
        body: JSON.stringify({ ids, is_read }),
      }
    );
  }

  async bulkDeleteSubmissions(formId: string, ids: string[]) {
    return this.request<{ success: boolean; deleted: number }>(
      `/forms/${formId}/submissions/bulk`,
      {
        method: "DELETE",
        body: JSON.stringify({ ids }),
      }
    );
  }

  getExportUrl(formId: string, params: Omit<SubmissionParams, "page" | "limit"> = {}) {
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.set("search", params.search);
    if (params.startDate) searchParams.set("startDate", params.startDate);
    if (params.endDate) searchParams.set("endDate", params.endDate);

    const query = searchParams.toString();
    return `${API_BASE}/forms/${formId}/submissions/export${query ? `?${query}` : ""}`;
  }
}

// Custom error class
class ApiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

// Types
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

// Form builder field types
export type FieldType =
  | "text"
  | "email"
  | "number"
  | "phone"
  | "textarea"
  | "select"
  | "radio"
  | "checkbox"
  | "date"
  | "file"
  | "hidden"
  | "section";

export interface FieldOption {
  label: string;
  value: string;
}

export interface FieldValidation {
  min?: number;
  max?: number;
  pattern?: string;
  patternMessage?: string;
  accept?: string;
  maxFileSize?: number;
}

export interface FormFieldDefinition {
  id: string;
  type: FieldType;
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  helpText?: string;
  defaultValue?: string;
  options?: FieldOption[];
  validation?: FieldValidation;
  sectionContent?: string;
}

export interface FormSettings {
  default_subject?: string;
  default_template?: "basic" | "table" | "minimal";
  recaptcha_enabled?: boolean;
  recaptcha_threshold?: number;
  allowed_origins?: string[];
  webhook_url?: string | null;
  cc_emails?: string[];
  field_schema?: FormFieldDefinition[];
}

export interface FormWithCounts extends Form {
  submission_count: number;
  unread_count: number;
  latest_submission_at: string | null;
}

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

export interface SubmissionParams {
  page?: number;
  limit?: number;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    has_more: boolean;
  };
}

export const api = new ApiClient();
export { ApiError };
