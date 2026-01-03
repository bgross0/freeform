/**
 * URL validation utilities for Freeform
 * Validates and sanitizes redirect URLs
 */

// Blocked URL schemes that could be malicious
const BLOCKED_SCHEMES = [
  "javascript:",
  "data:",
  "vbscript:",
  "file:",
  "about:",
  "blob:",
];

// Blocked hostname patterns
const BLOCKED_HOSTS = [
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "[::1]",
];

/**
 * Validate a redirect URL
 * Returns the validated URL or null if invalid/blocked
 */
export function validateRedirectUrl(url: string): string | null {
  if (!url || typeof url !== "string") {
    return null;
  }

  const trimmedUrl = url.trim();

  // Check for blocked schemes
  const lowerUrl = trimmedUrl.toLowerCase();
  for (const scheme of BLOCKED_SCHEMES) {
    if (lowerUrl.startsWith(scheme)) {
      return null;
    }
  }

  // Try to parse as URL
  try {
    const parsed = new URL(trimmedUrl);

    // Only allow http and https
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return null;
    }

    // Block localhost and internal IPs
    const hostname = parsed.hostname.toLowerCase();
    if (BLOCKED_HOSTS.includes(hostname)) {
      return null;
    }

    // Block private IP ranges
    if (isPrivateIP(hostname)) {
      return null;
    }

    // Return the validated URL
    return parsed.toString();
  } catch {
    // If it's a relative URL, allow it (will be resolved relative to referrer)
    if (trimmedUrl.startsWith("/") && !trimmedUrl.startsWith("//")) {
      return trimmedUrl;
    }

    return null;
  }
}

/**
 * Check if hostname is a private IP address
 */
function isPrivateIP(hostname: string): boolean {
  // IPv4 private ranges
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = hostname.match(ipv4Regex);

  if (match) {
    const [, a, b] = match.map(Number);

    // 10.0.0.0/8
    if (a === 10) return true;

    // 172.16.0.0/12
    if (a === 172 && b >= 16 && b <= 31) return true;

    // 192.168.0.0/16
    if (a === 192 && b === 168) return true;

    // 169.254.0.0/16 (link-local)
    if (a === 169 && b === 254) return true;

    // 127.0.0.0/8 (loopback)
    if (a === 127) return true;
  }

  return false;
}

/**
 * Sanitize URL for safe display
 */
export function sanitizeUrlForDisplay(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove credentials from URL
    parsed.username = "";
    parsed.password = "";
    return parsed.toString();
  } catch {
    return url;
  }
}
