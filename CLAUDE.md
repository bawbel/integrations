# CLAUDE.md — bawbel/integrations

Read this file completely before touching any code.
Single source of truth for how work happens in this repo.

---

## Project

bawbel-integrations — CI/CD integrations, VS Code extension,
and pre-commit hooks for Bawbel Scanner.

- GitHub Action: `uses: bawbel/integrations@v2`
- VS Code Extension: `bawbel.bawbel-scanner` on VS Code Marketplace
- Pre-commit: `repo: https://github.com/bawbel/integrations`
- Scanner dependency: `bawbel-scanner>=1.2.3` on PyPI
- Main scanner repo: `github.com/bawbel/scanner`

This repo does NOT contain scanner logic.
It wraps the `bawbel` CLI and exposes it in developer environments.

---

## Three components — one repo

```
action.yml              GitHub Action — shell + Python
vscode/                 VS Code Extension — TypeScript + Node.js
bawbel_hooks/           Pre-commit hooks — Python
```

Each component has its own language, test approach, and release cycle.
They share: LANGUAGE.md vocabulary, the `bawbel` CLI as their backend,
and the SARIF output format as the integration contract.

---

## Architecture — one-line per component

```
GitHub Action:  bawbel.yml config → bawbel scan → SARIF → Security Tab
                                                 → PR comment (on PR events)

VS Code:        file save → bawbel scan --format json → Diagnostics API
                         → inline squiggles → Problems panel → hover tooltips

Pre-commit:     git commit → bawbel_pre_commit.py → bawbel scan → exit 0/1
```

The `bawbel` CLI is the only shared dependency.
None of these components import from each other.

---

## Current priority tasks (pick ONE at a time)

### TASK A: bawbel.yml config reading in action.yml
`action.yml` currently reads inputs directly. It should read `bawbel.yml`
first as project-level defaults, then let explicit inputs override.
File: `action.yml` — Load bawbel.yml config step.
Test: `tests/action/test_config_loading.sh`

### TASK B: VS Code v1.2.x — AIVSS panel
Add a sidebar panel showing AIVSS score, evidence_stage, owasp_mcp
for the finding under cursor. Reads piranha_url from Finding JSON.
File: `vscode/src/panels/aivssPanel.ts`
Test: `vscode/src/test/panels/aivssPanel.test.ts`

### TASK C: VS Code v1.2.x — right-click accept
Right-click on a squiggle → "Accept finding (bawbel)" → calls
`bawbel accept <ave_id> <file> --line <N> --reviewer <git_user>`.
File: `vscode/src/commands/acceptFinding.ts`
Test: `vscode/src/test/commands/acceptFinding.test.ts`

---

## Function comments — mandatory

Every function must have a What/Why/How comment above the def/function line.

```python
# What: posts or updates a Bawbel scan summary comment on a pull request
# Why:  re-running a scan should update the existing comment, not add noise
# How:  lists existing PR comments, finds one containing "Bawbel Scanner",
#       PATCHes it if found or POSTs a new one if not
def post_pr_comment(token, repo, pr_number, body):
    ...
```

```typescript
// What: converts a bawbel JSON finding into a VS Code Diagnostic object
// Why:  VS Code requires DiagnosticSeverity not bawbel Severity strings
// How:  maps CRITICAL/HIGH → Error, MEDIUM → Warning, LOW → Information
function toDiagnostic(finding: BawbelFinding): vscode.Diagnostic {
    ...
}
```

Write the comment BEFORE writing the body. If you cannot answer all three,
the function scope is unclear — redesign first.

---

## TDD loop

```
1. Write the failing test
2. Run test → MUST FAIL
3. Write minimum code to pass
4. Run test → MUST PASS
5. Refactor (names from LANGUAGE.md, type hints, What/Why/How comment)
6. Run full suite → must pass before commit
```

---

## Local commands

```bash
# GitHub Action (test with act)
act pull_request -W .github/workflows/test-action.yml

# VS Code Extension
cd vscode/
npm install
npm test                   # unit tests
npm run compile            # TypeScript → JavaScript
npx vsce package           # build .vsix
code --install-extension bawbel-scanner-*.vsix

# Pre-commit hooks
cd bawbel_hooks/
pip install -e ".[dev]"
pytest tests/ -x -q

# Lint
cd vscode/ && npm run lint
ruff check bawbel_hooks/
```

---

## Hard rules

1. Write the failing test first. Always.
2. One task at a time. No combined fixes.
3. All names from LANGUAGE.md. No improvised terms.
4. What/Why/How comment on every function — write before the body.
5. This repo wraps the CLI — never import bawbel scanner internals directly.
6. The action MUST work with `no-install: true` (bawbel already in PATH).
7. VS Code diagnostics must survive `bawbel` not being installed (graceful degradation).
8. PR comment bot posts to Security Tab via SARIF — never injects code into repos.
9. `pytest tests/ -x -q` and `npm test` green before every commit.

---

## Agent skills

| Skill | When to use |
|---|---|
| `setup-bawbel-integrations` | First time setup |
| `grill-with-docs` | Before designing any feature |
| `design-an-interface` | When designing action inputs or extension APIs |
| `to-prd` | After grilling, lock the spec |
| `to-issues` | Break PRD into GitHub issues |
| `tdd` | Implementing any task |
| `improve-codebase-architecture` | Finding deepening opportunities |
| `diagnose` | When something is broken |
| `zoom-out` | Before editing unfamiliar code |
| `handoff` | End/start of every session |
| `git-guardrails` | Blocks dangerous git commands |

## Product context

Read PRODUCT.md for roadmap, competitive position, and research directions.
This repo is Phase 2/3 of the Bawbel roadmap.
For the main scanner: github.com/bawbel/scanner

---

## Security — think before you write

Every function that handles external input, runs a subprocess, reads a file,
or calls a network endpoint must answer four security questions before the
body is written. Add the answers as a `Sec:` block alongside What/Why/How.

```python
# What: fetches server card JSON from a remote MCP server URL
# Why:  scan_server_card needs the raw manifest to run pattern detection
# How:  urllib.request with 10s timeout, reads up to MAX_CONTENT_BYTES
#
# Sec:  INPUT  — URL validated to start with http:// or https:// only
#       OUTPUT — content capped at MAX_CONTENT_BYTES before returning
#       TRUST  — response treated as untrusted text, never eval'd or exec'd
#       ERROR  — HTTPError and URLError caught, returns (None, error_str)
def fetch_server_card(url: str) -> tuple[str | None, str | None]:
    ...
```

Not every function needs a Sec: block. A pure calculation function with no
external input does not need one. A function that reads a file, calls a
subprocess, or accepts a URL always does.

---

### The four security questions

**INPUT** — Is every caller-controlled value validated before use?

Reject before processing:
- Path traversal: `../`, absolute paths when relative is expected
- Shell metacharacters in anything passed to subprocess
- Oversized input: check against `MAX_FILE_SIZE_BYTES` before reading
- Non-UTF-8 bytes: use `errors="replace"` not `errors="strict"`
- URLs that are not `http://` or `https://`

**OUTPUT** — Is the output safe for every consumer?

- Truncate all match strings to `MAX_MATCH_LENGTH` (80 chars)
- Never return raw binary content
- Never return content that a downstream tool could execute
- Sanitize anything that will be rendered in HTML or markdown

**TRUST** — What trust level does this data have?

Everything from outside the process is untrusted:
- Remote content: server cards, URLs, tool descriptions, PiranhaDB responses
- User-supplied file content: skill files, MCP manifests, system prompts
- Environment variables: validate format, do not assume they are safe
- GitHub API responses: treat as untrusted text

Never `eval()`, `exec()`, `subprocess.run(shell=True)`,
or `pickle.loads()` on untrusted input. Ever.

**ERROR** — What happens when this fails?

- `scan()` never raises — always returns `ScanResult` with `error` field set
- Engines return `[]` on failure, never propagate exceptions to the caller
- Log the error at WARNING level, do not swallow it silently
- Return a typed error (tuple, Result, dataclass) not raise for expected failures
- Only raise for programming errors (wrong argument type, broken invariant)

---

### Hard rules — never violate

```
subprocess.run(shell=True, ...)          BANNED
eval() on any external input             BANNED
exec() on any external input             BANNED
pickle.loads() on any external input     BANNED
open(path) without size check first      BANNED
Path(user_input) without traversal check BANNED
requests.get(url, verify=False)          BANNED
logging.info(api_key) or print(secret)   BANNED
hardcoded credentials of any kind        BANNED
```

If you are about to write any of the above, stop. Redesign.

---

### Subprocess — always list form

```python
# WRONG — shell=True allows injection
subprocess.run(f"bawbel scan {path}", shell=True)

# RIGHT — list form, shell never invoked
subprocess.run(  # nosec B603
    ["bawbel", "scan", str(path)],
    capture_output=True,
    text=True,
    timeout=60,
)
```

nosec B603 is valid here because: (1) list form is used, not shell=True,
(2) `path` is a validated Path object, not raw user input.

---

### File reads — always size-check first

```python
# WRONG — no size limit, can OOM on large files
content = Path(path).read_text()

# RIGHT
if not path.exists():
    return ScanResult(error=f"file not found: {path}")
if path.stat().st_size > MAX_FILE_SIZE_BYTES:
    return ScanResult(error=f"file too large: {path.stat().st_size} bytes")
content = path.read_text(encoding="utf-8", errors="replace")
```

---

### URLs — always validate scheme

```python
# WRONG — accepts file://, data://, ftp://, anything
content, err = fetch_url(url)

# RIGHT
if not url.startswith(("http://", "https://")):
    return None, "URL must start with http:// or https://"
content, err = fetch_url(url)
```

---

### Path traversal — validate before use

```python
# WRONG — user can pass ../../etc/passwd
target = Path(base_dir) / user_supplied_name

# RIGHT
resolved = (Path(base_dir) / user_supplied_name).resolve()
if not str(resolved).startswith(str(Path(base_dir).resolve())):
    return None, "path traversal detected"
```

---

### Secrets — always from environment, never literals

```python
# WRONG
ANTHROPIC_API_KEY = "sk-abc123..."

# RIGHT
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
if not ANTHROPIC_API_KEY:
    logger.warning("ANTHROPIC_API_KEY not set — LLM engine disabled")
    return []
```

---

### nosec and noqa — only with explanation

```python
# WRONG — suppresses warning with no explanation
subprocess.run(cmd)  # nosec

# RIGHT — explains why the suppression is valid
subprocess.run(cmd_list, ...)  # nosec B603 — list form used, shell=True absent,
                                # cmd_list validated as [str, Path] before this call
```

nosec without an explanation is treated as a lint error during review.

---

### Bandit suppressions used in this repo

These are the approved suppressions. Any new nosec must be reviewed.

| Code | Meaning | When approved |
|---|---|---|
| B404/S404 | subprocess import | Always — we use subprocess intentionally |
| B603/S603 | subprocess.run | Only when list form is used, never shell=True |
| B108/S108 | /tmp path | Only in sandbox engine, documented |
| B110/S110 | try/except pass | Only with a log statement inside the except |

---

### Self-scan

The scanner scans itself on every PR via `.github/workflows/bawbel-scan.yml`.
If bawbel finds a security finding in its own code, that is a real finding.
Fix it before merging.