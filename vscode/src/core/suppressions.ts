/**
 * core/suppressions.ts — suppression store
 *
 * Reads and writes .bawbel-suppress.json at workspace root.
 * All suppression logic is here — never scattered across other modules.
 *
 * CONTRIBUTING: All suppression reads/writes must go through this module.
 * Do NOT read the JSON file directly from other modules.
 */

import * as cp   from "child_process";
import * as fs   from "fs";
import * as path from "path";
import { BawbelFinding } from "./types";
import * as vscode from "vscode";
import {
  Suppression,
  SUPPRESS_FILE,
} from "./types";

// ── Git user resolution ───────────────────────────────────────────────────────

/**
 * Resolve the current developer identity for the suppression audit trail.
 *
 * Priority:
 *   1. git config user.name + user.email  (workspace .git/config)
 *   2. git config --global                (global ~/.gitconfig)
 *   3. OS username                        (process.env.USER / USERNAME)
 *   4. "vscode"                           (fallback)
 *
 * No dependency on GitLens or any extension — plain git CLI call.
 */
async function resolveGitUser(): Promise<string> {
  const run = (cmd: string, args: string[]): Promise<string> =>
    new Promise(resolve => {
      const proc = cp.spawn(cmd, args, {
        cwd:   vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
        shell: process.platform === "win32",
      });
      let out = "";
      proc.stdout.on("data", (d: Buffer) => { out += d.toString(); });
      proc.on("error", ()  => resolve(""));
      proc.on("close", ()  => resolve(out.trim()));
    });

  // Workspace-level first, then global
  const name  = await run("git", ["config", "user.name"])
             || await run("git", ["config", "--global", "user.name"]);
  const email = await run("git", ["config", "user.email"])
             || await run("git", ["config", "--global", "user.email"]);

  if (name && email) { return `${name} <${email}>`; }
  if (name)          { return name; }
  if (email)         { return email; }

  // OS username fallback
  const osUser = process.env["USER"] || process.env["USERNAME"] || process.env["LOGNAME"];
  if (osUser)  { return osUser; }

  return "vscode";
}

// ── Read / Write ──────────────────────────────────────────────────────────────

export function getSuppressFilePath(): string | null {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) { return null; }
  return path.join(folders[0].uri.fsPath, SUPPRESS_FILE);
}

export function loadSuppressions(): Suppression[] {
  const p = getSuppressFilePath();
  if (!p || !fs.existsSync(p)) { return []; }
  try {
    const raw = fs.readFileSync(p, "utf8");
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) { return []; }
    return data as Suppression[];
  } catch {
    return [];
  }
}

export function saveSuppressions(suppressions: Suppression[]): void {
  const p = getSuppressFilePath();
  if (!p) { return; }
  fs.writeFileSync(p, JSON.stringify(suppressions, null, 2) + "\n", "utf8");
}

// ── Query ─────────────────────────────────────────────────────────────────────

export function isSuppressed(
  suppressions: Suppression[],
  filePath:     string,
  finding:      BawbelFinding
): boolean {
  const rel = toRelative(filePath);
  return suppressions.some(
    s => s.rule_id === finding.rule_id &&
         s.file    === rel             &&
         s.line    === finding.line
  );
}

// ── Mutate ────────────────────────────────────────────────────────────────────

export async function addSuppression(
  filePath: string,
  finding:  BawbelFinding,
  reason:   string
): Promise<Suppression[]> {
  const rel          = toRelative(filePath);
  const suppressions = loadSuppressions();

  // Idempotent — don't add duplicate
  const exists = suppressions.some(
    s => s.rule_id === finding.rule_id && s.file === rel && s.line === finding.line
  );
  if (exists) { return suppressions; }

  // Resolve git user for audit trail — falls back gracefully
  const author = await resolveGitUser();

  suppressions.push({
    rule_id:       finding.rule_id,
    file:          rel,
    line:          finding.line,
    reason:        reason || "false positive",
    suppressed_at: new Date().toISOString(),
    suppressed_by: author,
  });

  saveSuppressions(suppressions);
  return suppressions;
}

export function removeSuppression(
  filePath: string,
  finding:  BawbelFinding
): Suppression[] {
  const rel = toRelative(filePath);
  const updated = loadSuppressions().filter(
    s => !(s.rule_id === finding.rule_id && s.file === rel && s.line === finding.line)
  );
  saveSuppressions(updated);
  return updated;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toRelative(filePath: string): string {
  const root = vscode.workspace.workspaceFolders?.[0].uri.fsPath ?? "";
  return path.relative(root, filePath);
}

// ── Inline ignore filter ──────────────────────────────────────────────────────

// What: filters out findings whose source line contains a bawbel-ignore comment
// Why:  CLI v1.0.0 does not parse inline ignore comments — extension handles it
//       client-side; lives here because it is a suppression mechanism, not a
//       rendering concern
// How:  reads the file once, checks the finding's own line for a bawbel-ignore
//       comment; removes the finding if the comment is bare (suppress all) or
//       specifies a matching rule_id / ave_id
//
// Sec:  INPUT  — filePath is a VS Code-provided path, not raw user input;
//                findings is internal data from the CLI parse step
//       OUTPUT — filtered subset of findings; no file content returned to callers
//       TRUST  — file content treated as untrusted text; never eval'd
//       ERROR  — any read failure returns findings unfiltered (fail open)
export function filterInlineIgnored(
  filePath: string,
  findings: BawbelFinding[]
): BawbelFinding[] {
  if (findings.length === 0) { return findings; }

  let lines: string[];
  try {
    const content = fs.readFileSync(filePath, "utf8") as string;
    lines         = content.split("\n");
  } catch {
    return findings; // can't read file — return unfiltered
  }

  return findings.filter(f => {
    const lineIdx  = (f.line ?? 1) - 1; // 0-based
    const lineText = lines[lineIdx] ?? "";

    if (!lineText.includes("bawbel-ignore")) { return true; }

    // bare bawbel-ignore — suppress all rules on this line
    const ignoreAll = /bawbel-ignore\s*(?:-->|\*\/)?\s*$/.test(lineText);
    if (ignoreAll) { return false; }

    // bawbel-ignore: rule_id or AVE-ID — suppress specific rule/AVE
    // Non-greedy capture before --> or */ or end-of-line so hyphens in
    // rule IDs (bawbel-shell-pipe) and AVE IDs (AVE-2026-00001) are kept.
    const ruleMatch = lineText.match(/bawbel-ignore:\s*(.+?)(?:\s*-->|\s*\*\/|\s*$)/);
    if (ruleMatch) {
      const targets = ruleMatch[1].split(",").map(s => s.trim()).filter(Boolean);
      if (targets.includes(f.rule_id) || targets.includes(f.ave_id)) {
        return false;
      }
    }

    return true;
  });
}
