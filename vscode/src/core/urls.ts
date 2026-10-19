/**
 * core/urls.ts: Bawbel VS Code Extension
 *
 * Pure URL helpers. No vscode import, so they run and can be checked in plain Node.
 * core/links.ts reads the settings and calls these.
 */

import { DEFAULT_AVE_API_URL } from "./types";

/**
 * The AVE API base URL to use for a raw setting value. The value is parsed as a URL and
 * must be http(s) with a host; the result is rebuilt from origin and path (percent-encoded,
 * no query or fragment, no trailing slash). Anything else gives DEFAULT_AVE_API_URL, so a
 * bad setting never produces a link to an unexpected scheme or a broken HTML attribute.
 */
export function resolveAveApiUrl(raw: unknown): string {
  if (typeof raw === "string") {
    try {
      const url = new URL(raw.trim());
      if ((url.protocol === "https:" || url.protocol === "http:") && url.hostname) {
        return `${url.origin}${url.pathname}`.replace(/\/+$/, "");
      }
    } catch {
      // not a URL: fall through to the default
    }
  }
  return DEFAULT_AVE_API_URL;
}

/** The URL of one AVE record under base. */
export function aveRecordUrl(base: string, aveId: string): string {
  return `${base}/records/${encodeURIComponent(aveId)}`;
}
