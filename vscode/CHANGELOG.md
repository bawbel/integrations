# Changelog

## [Unreleased]

### Fixed
- Hover shows the OWASP AIVSS score (`aivss_score`) as `AIVSS: x/10`. It read the
  retired `cvss_ai` field, which bawbel-scanner no longer emits, and showed
  `CVSS-AI: undefined/10`.

## [1.1.0] — 2026-04-26

### Added
- **Full modular architecture** — extension refactored into `core/`, `features/`,
  `ui/` modules. Each module has a single responsibility. Contributors change one
  file without breaking others. See README for module map.
- **`Bawbel: Scan Folder…`** — pick any folder in the workspace to scan
- **`Bawbel: Show Report`** (`Cmd+Alt+R`) — opens `bawbel report` output in a
  webview panel beside the editor. Full remediation guide: AVE IDs, CVSS-AI scores,
  OWASP mapping, step-by-step fix instructions.
- **Watch mode** — `Bawbel: Start Watch Mode` spawns a background `bawbel --watch`
  process. Scope: file / folder / workspace (configurable). Uses pattern+yara only
  (~25ms) — never slows the machine.
- **`bawbel.watchScope`** setting — `file` | `folder` | `workspace`
- **`bawbel.watchMode`** setting — auto-start watch on activation (default: false)
- **FP suppression** — right-click any finding → suppress false positive → enter
  reason → saved to `.bawbel-suppress.json`. Suppressed findings show as faded hints.
- **Remove suppression** — right-click a suppressed hint → remove suppression
- **`Bawbel: Show Suppressions`** — lists all active suppressions in Output panel
- **Right-click Explorer** — scan folder or workspace from the file tree
- **Animated GIF demos** in README — scan, report, FP suppression, watch mode

### Changed
- `extension.ts` is now a thin orchestrator under 250 lines — zero business logic
- `core/types.ts` is the single source of truth for all shared types
- `core/parser.ts` is the only place that parses CLI JSON output
- Auto-scan on save skips automatically when watch mode is active (no duplicate scans)
- Status bar count excludes suppressed findings
- Watch mode uses `pattern,yara` engines only — Semgrep/LLM never run in background

### Fixed
- Binary detection covers pipx installs and `~/.local/bin/` paths
- Suppression re-renders diagnostics from cache — no re-scan needed

## [1.0.1] — 2026-04-26

### Fixed
- JSON parsing — correct CLI output schema (`file_path` not `file`)
- Binary detection — calls `bawbel` directly, not `python3 -m bawbel`
- Hover tooltip shows full finding detail
- Keybinding conflict — `Cmd+Shift+B` → `Cmd+Alt+B`

### Added
- Inline remediation hints (12 rule IDs)
- Output panel logging — stdout, stderr, exit code per scan
- `bawbel.bawbelPath` setting

## [1.0.0] — 2026-04-26

### Added
- Initial release
- Inline diagnostics, status bar, auto-scan on save
- Workspace scan, PiranhaDB links, auto-install CLI