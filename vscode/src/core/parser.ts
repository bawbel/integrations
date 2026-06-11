/**
 * core/parser.ts — CLI output normaliser
 *
 * Single place that understands bawbel CLI JSON output format.
 * If the CLI schema changes, update ONLY this file.
 *
 * CONTRIBUTING: Never parse CLI output anywhere else. Always call parseCliOutput().
 */

import { BawbelFileResult, BawbelFinding } from "./types";

/**
 * Parse raw stdout from `bawbel scan --format json`.
 *
 * bawbel v1.0.0 outputs a top-level JSON array:
 *   [{ file_path, findings, risk_score, scan_time_ms, ... }]
 *
 * This function is defensive — it handles partial output, prefixed text,
 * single-object responses, and bare finding arrays from older CLI versions.
 *
 * @param stdout - Raw stdout string from CLI process
 * @param fallbackPath - File path to use if the result has none
 * @returns Parsed results, never throws
 */
export function parseCliOutput(
  stdout: string,
  fallbackPath: string
): { results: BawbelFileResult[]; error: string | null } {
  const raw = stdout.trim();

  if (!raw) {
    return { results: [], error: null };
  }

  // Find JSON start — output may have a version header line before JSON
  const arrayStart  = raw.indexOf("[");
  const objectStart = raw.indexOf("{");

  // Prefer array (primary format), fall back to object
  const jsonStart =
    arrayStart >= 0 && (objectStart < 0 || arrayStart <= objectStart)
      ? arrayStart
      : objectStart;

  if (jsonStart < 0) {
    return { results: [], error: `No JSON found in output: ${raw.slice(0, 100)}` };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.slice(jsonStart));
  } catch (e) {
    return { results: [], error: `JSON parse failed: ${e}` };
  }

  const results = normalise(parsed, fallbackPath);
  return { results, error: null };
}

function normalise(data: unknown, fallbackPath: string): BawbelFileResult[] {
  // Primary format: top-level array of file results
  if (Array.isArray(data)) {
    // Array of file result objects
    if (data.length > 0 && typeof data[0] === "object" && data[0] !== null && "file_path" in data[0]) {
      return data.map(r => normaliseFileResult(r as Record<string, unknown>, fallbackPath));
    }
    // Bare array of findings (very old format)
    if (data.length > 0 && typeof data[0] === "object" && data[0] !== null && "rule_id" in data[0]) {
      return [{
        file_path:      fallbackPath,
        component_type: "unknown",
        risk_score:     0,
        max_severity:   "LOW",
        scan_time_ms:   0,
        has_error:      false,
        findings:       data as BawbelFinding[],
      }];
    }
    return [];
  }

  // Single object with results array: { results: [...] }
  if (typeof data === "object" && data !== null && "results" in data) {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.results)) {
      return normalise(obj.results, fallbackPath);
    }
  }

  // Single file result object: { file_path, findings, ... }
  if (typeof data === "object" && data !== null && "file_path" in data) {
    return [normaliseFileResult(data as Record<string, unknown>, fallbackPath)];
  }

  return [];
}

function normaliseFileResult(
  obj: Record<string, unknown>,
  fallbackPath: string
): BawbelFileResult {
  const rawFindings = Array.isArray(obj.findings) ? obj.findings : [];
  return {
    file_path:      String(obj.file_path      ?? fallbackPath),
    component_type: String(obj.component_type ?? "unknown"),
    risk_score:     Number(obj.risk_score      ?? 0),
    max_severity:   String(obj.max_severity    ?? "LOW"),
    scan_time_ms:   Number(obj.scan_time_ms    ?? 0),
    has_error:      Boolean(obj.has_error      ?? false),
    findings:       rawFindings.map(f => normaliseFinding(f as Record<string, unknown>)),
    error:          obj.error ? String(obj.error) : undefined,
  };
}

// What: maps a raw CLI finding object to the typed BawbelFinding interface
// Why:  parser.ts is the single seam for CLI schema changes — all field renames
//       and additions happen here, not scattered across consumers
// How:  explicit field mapping with defaults; optional fields left undefined when
//       absent so consumers can distinguish "not present" from "0" or "";
//       line can be null (file-level findings have no line number)
export function normaliseFinding(obj: Record<string, unknown>): BawbelFinding {
  const f: BawbelFinding = {
    rule_id:     String(obj.rule_id     ?? ""),
    ave_id:      String(obj.ave_id      ?? ""),
    title:       String(obj.title       ?? ""),
    description: String(obj.description ?? ""),
    severity:    String(obj.severity    ?? "LOW") as BawbelFinding["severity"],
    line:        obj.line != null ? Number(obj.line) : null,
    engine:      String(obj.engine      ?? ""),
  };

  if (obj.col             !== undefined) { f.col            = Number(obj.col); }
  if (obj.match           !== undefined) { f.match          = String(obj.match); }
  if (obj.cvss_ai         !== undefined) { f.cvss_ai        = Number(obj.cvss_ai); }
  if (obj.aivss_score     !== undefined) { f.aivss_score    = Number(obj.aivss_score); }
  if (obj.aivss           !== undefined) { f.aivss          = obj.aivss as BawbelFinding["aivss"]; }
  if (obj.owasp           !== undefined) { f.owasp          = Array.isArray(obj.owasp)     ? obj.owasp.map(String)     : undefined; }
  if (obj.owasp_mcp       !== undefined) { f.owasp_mcp      = Array.isArray(obj.owasp_mcp) ? obj.owasp_mcp.map(String) : undefined; }
  if (obj.piranha_url     !== undefined) { f.piranha_url    = String(obj.piranha_url); }
  if (obj.evidence_stage  !== undefined) { f.evidence_stage = String(obj.evidence_stage); }
  if (obj.confidence      !== undefined) { f.confidence     = Number(obj.confidence); }
  if (obj.derived         !== undefined) { f.derived        = Boolean(obj.derived); }

  return f;
}
