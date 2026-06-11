# LANGUAGE.md — bawbel/integrations Domain Language

All names in this repo must come from this file.
Terms shared with bawbel/scanner are marked (shared).

Banned: `component`, `service`, `plugin` (use Extension), `check` (use Finding),
`error` when you mean Finding, `lint` when you mean scan.

---

## Architecture terms (Matt Pocock)

**Module** — anything with interface + implementation
**Interface** — everything a caller must know: types, invariants, error modes
**Depth** — leverage: lot of behavior behind a small interface
**Seam** — where an interface lives; place behavior can be altered
**Deletion test** — would deleting this module concentrate complexity?

---

## GitHub Action domain

**ActionInput** — a declared input in `action.yml` `inputs:` block.
Fields: name, description, required, default.
Current inputs: path, recursive, fail-on-severity, format, no-ignore,
comment-on-pr, github-token, version, extras.

**ActionOutput** — a declared output in `action.yml` `outputs:` block.
Current outputs: sarif-file, findings-count, toxic-flows-count,
risk-score, result.

**SARIFFile** — Static Analysis Results Interchange Format file.
`bawbel-results.sarif` — uploaded to GitHub Security Tab.
Never posted in PR comments. Only via `upload-sarif` action.

**PRComment** — formatted markdown comment posted on a pull request.
Contains: status icon, severity label, findings table, toxic flows,
PiranhaDB links. Updated in-place on re-runs (no duplicate comments).

**ConfigFile** — `bawbel.yml` in the scanned repo root.
Read by the "Load bawbel.yml config" step before scanning.
Values from ConfigFile are overridden by explicit ActionInputs.

**ConfigPriority** — the resolution order for scan settings:
`ActionInput (explicit) > ConfigFile value > ActionInput default`

**SeverityThreshold** — the value of `fail-on-severity` after ConfigPriority
resolution. The action exits with code 2 if any finding meets or exceeds this.

**AuditMode** — when `no-ignore: true` is set. Bypasses all suppressions.
Shows all findings including those suppressed by .bawbelignore and
justified suppressions. Equivalent to `bawbel scan --no-ignore`.

---

## VS Code Extension domain

**Extension** — the VS Code extension `bawbel.bawbel-scanner`. Not "plugin".

**Diagnostic** — a single VS Code problem entry created from a Finding.
Maps to VS Code `vscode.Diagnostic` with range, message, severity, source.
Created by: `toDiagnostic(finding: BawbelFinding): vscode.Diagnostic`

**DiagnosticCollection** — the set of all active Diagnostics for a document.
Cleared and rebuilt on every scan. Named "bawbel" in the Problems panel.

**BawbelFinding** — the JSON shape of one finding from `bawbel scan --format json`.
Contains: rule_id, ave_id, title, severity, aivss_score, line, match,
engine, owasp_mcp, piranha_url, confidence, evidence_stage, derived.

**ScanResult** (shared) — the JSON array output from `bawbel scan --format json`.
One BawbelFinding per element. Parsed by the extension after each scan.

**AIVSSPanel** — the VS Code sidebar webview showing AIVSS score,
evidence_stage, confidence_band, owasp_mcp for the active Finding.

**AcceptCommand** — the VS Code command `bawbel.acceptFinding`.
Right-click on a squiggle → calls `bawbel accept` via the CLI.
Writes the justified suppression comment into the file.

**WatchMode** — background scanning triggered by file change events.
Status bar shows: `👁 Bawbel: watching`

**StatusBarItem** — the Bawbel status bar entry.
States: `Bawbel: ✓ clean` / `Bawbel: N finding(s)` / `👁 Bawbel: watching`
/ `Bawbel: scanning...` / `Bawbel: not installed`

**GracefulDegradation** — behavior when `bawbel` is not installed.
Extension activates but shows "Bawbel: not installed" in status bar.
Does not throw. Offers to run `pip install bawbel-scanner`.

---

## Pre-commit domain

**HookDefinition** — one entry in `.pre-commit-hooks.yaml`.
id: bawbel-scan (pattern engine, ~15ms per file)
id: bawbel-scan-all (all engines, slower)

**HookRunner** — `bawbel_hooks/bawbel_pre_commit.py`.
Receives files as CLI args from pre-commit. Calls `bawbel scan`.
Exits 0 (clean) or 1 (findings at or above threshold).

**HookInit** — `bawbel_hooks/pre_commit_init.py`.
First-run setup. Checks bawbel is installed. Offers pip install.

---

## Shared terms (from bawbel/scanner LANGUAGE.md)

**Finding** (shared) — single detected vulnerability instance.
**ToxicFlow** (shared) — derived artifact, chained capability attack path.
**AIVSS** (shared) — OWASP AI Vulnerability Severity Score v0.8.
**confidence** (shared) — float 0.0-1.0, certainty of a finding.
**evidence_stage** (shared) — lifecycle state of a finding.
**AVERecord** (shared) — vulnerability definition from the AVE standard.
**SuppressedFinding** (shared) — finding filtered by FP pipeline.
**AcceptedFinding** (shared) — human-reviewed justified suppression.
**PiranhaDB** (shared) — threat intel API at api.piranha.bawbel.io.

---

## Banned terms

| Banned | Use instead |
|---|---|
| plugin | Extension (VS Code) |
| addon | Extension (VS Code) |
| check | Finding |
| lint | scan |
| error | Diagnostic (VS Code) / Finding (domain) |
| alert | Finding / Diagnostic |
| config | ConfigFile or bawbel.yml (be specific) |
| settings | ActionInput (GitHub) or Extension settings (VS Code) |
