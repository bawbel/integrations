# Pre-commit Integration

## Setup

```bash
pip install pre-commit
pre-commit install
```

Add to `.pre-commit-config.yaml`:

```yaml
repos:
  - repo: https://github.com/bawbel/bawbel-integrations
    rev: <release-commit-sha>  # frozen: <release tag>
    hooks:
      - id: bawbel-scan
```

No release contains these hooks yet. `.pre-commit-hooks.yaml` was added after v1.1.0, so
`rev: v1` and `rev: v1.1.0` fail with
`InvalidManifestError: .pre-commit-hooks.yaml is not a file`. Until a release contains
it, use Option 2. After that, set `rev` to the commit SHA of that release, with the tag in a
comment as below.

That's it. On every `git commit`, Bawbel will scan your staged
`.md`, `.yaml`, and `.json` files for AVE vulnerabilities.

---

## Options

### Fail on different severity

```yaml
hooks:
  - id: bawbel-scan
    args: ["--fail-on-severity", "critical"]  # only block on CRITICAL
```

Choices: `critical` | `high` (default) | `medium` | `low`

### All engines (slower, more thorough)

```yaml
hooks:
  - id: bawbel-scan-all   # uses bawbel-scanner[all]
```

Includes YARA, Semgrep, and Magika on top of the pattern engine.

### Audit mode (ignore suppressions)

```yaml
hooks:
  - id: bawbel-scan
    args: ["--no-ignore"]
```

---

## Example output

```
Bawbel Scanner
──────────────────────────────────────────────────────
AVE vulnerabilities found (HIGH+):
  [HIGH] AVE-2026-00002  skills/search.md  line 12
  [HIGH] AVE-2026-00004  skills/fetch.md   line 7

Run 'bawbel report <file>' for remediation steps.
Add '<!-- bawbel-ignore: rule_id -->' to suppress false positives.
See: https://bawbel.io/docs/suppression
```

---

## Suppressing false positives

Inline — on the finding line:

```markdown
fetch https://internal.co  <!-- bawbel-ignore: bawbel-external-fetch -->
```

Or skip the commit entirely:

```bash
git commit --no-verify   # skip all hooks
```