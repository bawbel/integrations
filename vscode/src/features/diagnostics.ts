/**
 * features/diagnostics.ts — diagnostic manager
 *
 * Converts BawbelFileResult[] into VS Code diagnostics.
 * Applies suppression filtering before publishing.
 * Caches raw findings so suppression changes re-render without re-scanning.
 *
 * CONTRIBUTING: This is the only module that touches diagnosticCollection.
 * Never call diagnosticCollection.set() from other modules.
 */

import * as path from "path";
import * as vscode from "vscode";
import {
  BawbelFinding,
  BawbelFileResult,
  Suppression,
  SEVERITY_INDEX,
  SEVERITY_EMOJI,
  PIRANHA_BASE,
  SUPPRESS_FILE,
} from "../core/types";
import { getRemediation, hasSpecificRemediation } from "../core/remediation";
import { isSuppressed, loadSuppressions, filterInlineIgnored } from "../core/suppressions";

// ── Severity mapping ──────────────────────────────────────────────────────────

// What: maps a bawbel severity string + configured threshold to a VS Code DiagnosticSeverity
// Why:  findings at or above the user's failOnSeverity threshold show as errors (red
//       squiggles); below it show as warnings — pure calculation, no VS Code state needed
// How:  compares SEVERITY_INDEX values; unknown severities default to 0 (below any
//       threshold) so they render as warnings rather than silently disappearing
export function toVsSeverity(
  severity:   string,
  failSevIdx: number
): vscode.DiagnosticSeverity {
  return (SEVERITY_INDEX[severity] ?? 0) >= failSevIdx
    ? vscode.DiagnosticSeverity.Error
    : vscode.DiagnosticSeverity.Warning;
}

// ── Cache ─────────────────────────────────────────────────────────────────────
// Stores raw findings per file so we can re-apply suppression without re-scanning.

interface CacheEntry {
  filePath: string;
  findings: BawbelFinding[];
}

export class DiagnosticsManager {
  private collection: vscode.DiagnosticCollection;
  private readonly rawCache = new Map<string, CacheEntry>();

  constructor(collection: vscode.DiagnosticCollection) {
    this.collection = collection;
  }

  /**
   * Apply scan results as VS Code diagnostics.
   * Caches raw findings for later suppression re-rendering.
   * Filters out findings whose line is preceded by a bawbel-ignore comment.
   */
  applyResults(results: BawbelFileResult[]): void {
    const suppressions = loadSuppressions();
    const failSevIdx   = this.resolveFailSevIdx();

    for (const result of results) {
      const uri      = vscode.Uri.file(result.file_path);
      const findings = filterInlineIgnored(
        result.file_path,
        result.findings ?? []
      );
      this.rawCache.set(uri.toString(), {
        filePath: result.file_path,
        findings,
      });
      this.renderDiagnostics(result.file_path, findings, suppressions, failSevIdx);
    }
  }

  /**
   * Re-render diagnostics for a file using cached findings.
   * Call this after a suppression is added or removed — no re-scan needed.
   */
  reRender(filePath: string): void {
    const uri    = vscode.Uri.file(filePath);
    const cached = this.rawCache.get(uri.toString());
    if (cached) {
      const suppressions = loadSuppressions();
      const failSevIdx   = this.resolveFailSevIdx();
      this.renderDiagnostics(cached.filePath, cached.findings, suppressions, failSevIdx);
    }
  }

  /**
   * Re-render all cached files.
   * Call this after loading a new .bawbel-suppress.json.
   */
  reRenderAll(): void {
    const suppressions = loadSuppressions();
    const failSevIdx   = this.resolveFailSevIdx();
    this.rawCache.forEach(entry => {
      this.renderDiagnostics(entry.filePath, entry.findings, suppressions, failSevIdx);
    });
  }

  /**
   * Clear diagnostics for a specific file.
   */
  clearFile(filePath: string): void {
    this.collection.set(vscode.Uri.file(filePath), []);
  }

  /**
   * Get cached findings for a file (used by code action provider).
   */
  getCachedFindings(filePath: string): BawbelFinding[] {
    return this.rawCache.get(vscode.Uri.file(filePath).toString())?.findings ?? [];
  }

  /**
   * Count all active (non-suppressed, non-hint) diagnostics across all files.
   */
  countActiveFindings(): number {
    let total = 0;
    this.collection.forEach((_, diags) => {
      total += diags.filter(
        d => d.source === "Bawbel" &&
             d.severity !== vscode.DiagnosticSeverity.Hint
      ).length;
    });
    return total;
  }

  // ── Private rendering ───────────────────────────────────────────────────────

  // What: resolves the failOnSeverity index from VS Code configuration
  // Why:  extracted so applyResults / reRenderAll call getConfiguration once
  // How:  reads bawbel.failOnSeverity, uppercases, looks up SEVERITY_INDEX
  private resolveFailSevIdx(): number {
    const config = vscode.workspace.getConfiguration("bawbel");
    return SEVERITY_INDEX[
      config.get<string>("failOnSeverity", "high").toUpperCase()
    ] ?? SEVERITY_INDEX["HIGH"];
  }

  private renderDiagnostics(
    filePath:     string,
    findings:     BawbelFinding[],
    suppressions: Suppression[],
    failSevIdx:   number
  ): void {
    const uri   = vscode.Uri.file(filePath);
    const diags: vscode.Diagnostic[] = [];

    for (const f of findings) {
      const line  = Math.max(0, (f.line ?? 1) - 1);
      const col   = Math.max(0, (f.col  ?? 1) - 1);
      const range = new vscode.Range(line, col, line, col + (f.match?.length ?? 80));

      if (isSuppressed(suppressions, filePath, f)) {
        diags.push(this.buildSuppressedDiag(range, f));
      } else {
        diags.push(this.buildActiveDiag(range, f, failSevIdx));
      }
    }

    this.collection.set(uri, diags);
  }

  private buildActiveDiag(
    range:      vscode.Range,
    f:          BawbelFinding,
    failSevIdx: number
  ): vscode.Diagnostic {
    const vsSev = toVsSeverity(f.severity, failSevIdx);

    const emoji    = SEVERITY_EMOJI[f.severity] ?? "⚪";
    const fix      = getRemediation(f.rule_id, f.description);
    const fixLabel = hasSpecificRemediation(f.rule_id) ? "How to fix" : "Guidance";
    const owasp    = f.owasp?.join(", ") ?? "";

    const message = [
      `${emoji} [${f.severity}] ${f.title}`,
      "",
      f.match   ? `Matched: "${f.match.slice(0, 100)}"` : "",
      "",
      `${fixLabel}:`,
      `  ${fix}`,
      "",
      `AVE: ${f.ave_id}  |  CVSS-AI: ${f.cvss_ai}/10  |  Engine: ${f.engine}`,
      owasp     ? `OWASP: ${owasp}` : "",
      `Details: ${PIRANHA_BASE}/records/${f.ave_id}`,
    ].filter(s => s !== undefined).join("\n");

    const diag   = new vscode.Diagnostic(range, message, vsSev);
    diag.source  = "Bawbel";
    diag.code    = {
      value:  f.ave_id,
      target: vscode.Uri.parse(`${PIRANHA_BASE}/records/${f.ave_id}`),
    };

    if (f.severity === "LOW") {
      diag.tags = [vscode.DiagnosticTag.Unnecessary];
    }

    return diag;
  }

  private buildSuppressedDiag(
    range: vscode.Range,
    f:     BawbelFinding
  ): vscode.Diagnostic {
    const diag  = new vscode.Diagnostic(
      range,
      `[Suppressed] ${f.rule_id} — ${f.title}\n` +
      `Reason: see ${SUPPRESS_FILE}\n` +
      `Right-click → "Remove suppression" to re-enable.`,
      vscode.DiagnosticSeverity.Hint
    );
    diag.source = "Bawbel";
    diag.tags   = [vscode.DiagnosticTag.Unnecessary];
    diag.code   = {
      value:  f.ave_id,
      target: vscode.Uri.parse(`${PIRANHA_BASE}/records/${f.ave_id}`),
    };
    return diag;
  }
}