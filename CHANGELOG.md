# Changelog

All notable changes to bawbel-integrations are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

---

## [2.0.0] - 2026-05-24

### Added

**PR comment bot**

The GitHub Action now posts a formatted summary comment on every pull request
when `github-token` is set. The comment shows:

- Overall status with severity icon
- Findings count, toxic flows count, risk score
- Per-finding table with severity, AVE ID, title, AIVSS score (up to 5 per file)
- Toxic flow entries in the same table

The comment updates in place on re-runs - no duplicate comments per PR.

New inputs:
- `comment-on-pr` (default `true`): enable or disable PR comments
- `github-token` (default `""`): required for PR comments, use `secrets.GITHUB_TOKEN`

New output:
- `toxic-flows-count`: number of toxic flows detected across all scanned files

**`bawbel.yml` project config support**

The Action now reads `bawbel.yml` from the repo root if present and uses it
as the default config. Explicit action inputs override `bawbel.yml` values.
Config keys supported: `scan.recursive`, `scan.fail_on_severity`,
`scan.format`, `scan.no_ignore`.

**`.bawbelignore` auto-detection**

Documented explicitly: the scanner reads `.bawbelignore` from the scan root
automatically on every run. No Action config needed. Bypassed by `no-ignore: true`.

**`no-ignore` input**

New input `no-ignore` (default `false`). When set to `true`, bypasses all
suppression layers including `.bawbelignore`, inline comments, and justified
suppressions. Equivalent to `bawbel scan --no-ignore`. Use for audit runs.

**`toxic-flows-count` factored into result output**

Previously `result=findings` only triggered when `findings-count > 0`. Now
also triggers when `toxic-flows-count > 0`, so a file with only toxic flows
(no individual active findings) correctly reports `result=findings` and blocks
on the severity threshold.

### Changed

- Scanner version references updated to `v1.2.3`
- AVE record count updated from 40 to 48 across badges and documentation
- Repo links updated: `bawbel/bawbel-ave` -> `bawbel/ave`,
  `bawbel/bawbel-scanner` -> `bawbel/scanner`,
  `bawbel/bawbel-integrations` -> `bawbel/integrations`
- `permissions` block in example workflow updated to include `pull-requests: write`
  required for posting PR comments
- Pre-commit example `rev` updated from `v1` to `v2`

### Fixed

- `Run Bawbel scan` step: JSON scan previously used inline `$()` subshell
  expansion for `--recursive` and `--no-ignore` flags, which produced a
  literal empty string argument when false. Replaced with explicit conditionals.

---

## [1.1.0] - 2026-05-04

### Added

- GitLab CI example with SAST report upload
- Jenkins example with Docker agent
- CircleCI example
- Azure DevOps example
- Bitbucket Pipelines example
- Pre-commit local hook option for air-gapped environments
- `bawbel-scan-all` pre-commit hook (all engines)

### Changed

- Pre-commit hooks moved from `bawbel-scanner` repo to this repo

---

## [1.0.0] - 2026-04-25

### Added

- GitHub Action (`action.yml`): scan on push and pull request, SARIF output,
  `fail-on-severity` threshold, recursive scanning
- VS Code Extension (`vscode/`): inline diagnostics, auto-scan on save,
  watch mode, scan report webview, false-positive suppression
- Pre-commit hook (`bawbel-scan`): pattern engine, fast (~15ms per file)
- Example workflows for GitHub Actions

---

[Unreleased]: https://github.com/bawbel/integrations/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/bawbel/integrations/releases/tag/v2.0.0
[1.1.0]: https://github.com/bawbel/integrations/releases/tag/v1.1.0
[1.0.0]: https://github.com/bawbel/integrations/releases/tag/v1.0.0