/**
 * core/types.ts — Bawbel VS Code Extension
 *
 * Single source of truth for all shared types, interfaces, and enums.
 * Every module imports from here. Never define types inline elsewhere.
 *
 * CONTRIBUTING: Adding a new field to BawbelFinding or BawbelFileResult?
 * Add it here first, then update the normaliser in core/parser.ts.
 * Do NOT add fields directly to consuming code.
 */

// ── CLI Output Schema ─────────────────────────────────────────────────────────
// Matches bawbel-scanner v1.0.0 JSON output exactly.
// If the CLI schema changes, update ONLY this file and core/parser.ts.

export interface BawbelFinding {
  rule_id:         string;
  ave_id:          string;
  title:           string;
  description:     string;
  severity:        Severity;
  cvss_ai?:        number;           // present in older CLI versions
  aivss_score?:    number;           // top-level AIVSS score (v1.2+)
  aivss?:          AivssBreakdown;   // full AIVSS breakdown object
  line:            number | null;    // null when the finding is file-level, not line-level
  col?:            number;
  match?:          string;
  engine:          string;
  owasp?:          string[];         // OWASP AI Security categories (ASI*)
  owasp_mcp?:      string[];         // OWASP MCP threat categories (MCP*)
  piranha_url?:    string;
  evidence_stage?: string;
  confidence?:     number;
  derived?:        boolean;
}

export interface AivssBreakdown {
  cvss_base:         number;
  aarf:              Record<string, number>;
  aars:              number;
  thm:               number;
  mitigation_factor: number;
  aivss_score:       number;
  aivss_severity:    string;
  spec_version:      string;
}

export interface BawbelFileResult {
  file_path:      string;
  component_type: string;
  risk_score:     number;
  max_severity:   string;
  scan_time_ms:   number;
  has_error:      boolean;
  findings:       BawbelFinding[];
  error?:         string;
}

export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

// ── Suppression Schema ────────────────────────────────────────────────────────
// Stored in .bawbel-suppress.json at workspace root.

export interface Suppression {
  rule_id:        string;
  file:           string;   // relative to workspace root
  line:           number;
  reason:         string;
  suppressed_at:  string;   // ISO 8601
  suppressed_by:  string;   // "vscode" | "cli" | username
}

// ── Scan Modes ────────────────────────────────────────────────────────────────

export type ScanScope = "file" | "folder" | "workspace";

export type ScanMode  = "auto"   // on-save: pattern+yara, current file only
                      | "full"   // on-demand: all engines, scoped target
                      | "watch"; // background: pattern+yara, scoped target

export interface ScanRequest {
  scope:    ScanScope;
  target:   string;        // absolute path — file or directory
  mode:     ScanMode;
  engines?: string;        // comma-separated engine list, undefined = CLI default
}

// ── Extension State ───────────────────────────────────────────────────────────

export type StatusState =
  | "idle"
  | "watching"
  | "scanning"
  | "findings"
  | "error"
  | "installing";

// ── Constants ─────────────────────────────────────────────────────────────────

export const SUPPRESS_FILE   = ".bawbel-suppress.json";
export const OUTPUT_CHANNEL  = "Bawbel Scanner";
export const EXTENSION_ID    = "bawbel.bawbel-scanner";
export const PIRANHA_BASE    = "https://api.piranha.bawbel.io";
export const MARKETPLACE_URL = "https://marketplace.visualstudio.com/items?itemName=bawbel.bawbel-scanner";

export const SCAN_EXTENSIONS_DEFAULT = [".md", ".yaml", ".yml", ".json", ".txt"];

export const SEVERITY_INDEX: Record<string, number> = {
  CRITICAL: 4,
  HIGH:     3,
  MEDIUM:   2,
  LOW:      1,
  NONE:     0,
};

export const SEVERITY_EMOJI: Record<string, string> = {
  CRITICAL: "🔴",
  HIGH:     "🟠",
  MEDIUM:   "🟡",
  LOW:      "🔵",
};
