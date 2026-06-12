# bawbel-integrations

<!-- mcp-name: io.github.bawbel/integrations -->

Integrations for [Bawbel Scanner](https://bawbel.io) — scan MCP servers and
agentic AI skill files for [AVE vulnerabilities](https://github.com/bawbel/ave)
across every stage of your development workflow.

[![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-v2-2EA043)](action.yml)
[![VS Code](https://img.shields.io/visual-studio-marketplace/v/bawbel.bawbel-scanner?color=2EA043&label=VS_Code)](https://marketplace.visualstudio.com/items?itemName=bawbel.bawbel-scanner)
[![AVE Records](https://img.shields.io/badge/AVE_records-48-2EA043)](https://github.com/bawbel/ave)
[![Scanner](https://img.shields.io/badge/bawbel--scanner-v1.2.3-1B5E3F)](https://github.com/bawbel/scanner)
[![License](https://img.shields.io/badge/license-Apache_2.0-blue)](LICENSE)
[![MCP Registry](https://img.shields.io/badge/MCP_Registry-listed-purple)](https://registry.modelcontextprotocol.io)

---

## Integrations

| Integration | Status | Notes |
|---|---|---|
| [GitHub Actions](#github-actions) | ✅ v2 | PR comment bot, bawbel.yml support |
| [VS Code Extension](#vs-code-extension) | ✅ v1.1.1 | Inline diagnostics, auto-scan on save |
| [Pre-commit](#pre-commit) | ✅ v1.1 | Block at commit boundary |
| [GitLab CI](#gitlab-ci) | ✅ v1.1 | SAST report upload |
| [Jenkins](#jenkins) | ✅ v1.1 | Pipeline step |
| [CircleCI](#circleci) | ✅ v1.1 | Orb-style job |
| [Azure DevOps](#azure-devops) | ✅ v1.1 | Pipeline task |
| [Bitbucket Pipelines](#bitbucket-pipelines) | ✅ v1.1 | Step definition |

---

## GitHub Actions

### Quickstart

```yaml
# .github/workflows/bawbel.yml
name: Bawbel Security Scan
on: [push, pull_request]

jobs:
  scan:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
      contents: read
      pull-requests: write
    steps:
      - uses: actions/checkout@v4

      - uses: bawbel/integrations@v2
        with:
          path: .
          fail-on-severity: high
          github-token: ${{ secrets.GITHUB_TOKEN }}

      - uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: bawbel-results.sarif
```

This scans on every push and pull request. On PRs it posts a summary comment
with findings, risk score, and toxic flow count. Findings upload to the GitHub
Security tab as inline annotations via SARIF.

### PR comment

When `github-token` is set and the workflow runs on a `pull_request` event,
Bawbel posts a comment on the PR:

```
## ✅ Bawbel Scanner

**Clean** — no findings detected

|  |  |
|---|---|
| Findings | 0 |
| Toxic flows | 0 |
| Risk score | 0.0 / 10 |

🛡 Bawbel Scanner · AVE Database · PiranhaDB
```

When findings are present:

```
## 🟠 Bawbel Scanner

**HIGH** — risk score 8.7/10

|  |  |
|---|---|
| Findings | 4 |
| Toxic flows | 2 |
| Risk score | 8.7 / 10 |

| Severity | AVE ID | Title | AIVSS |
|---|---|---|---|
| 🔴 CRITICAL | AVE-2026-00001 | External instruction fetch | 8.0 |
| 🟠 HIGH | AVE-2026-00002 | Tool description injection | 7.3 |
| ⛓ CRITICAL | toxic flow | Credential Exfiltration Chain | 9.8 |

🛡 Bawbel Scanner · AVE Database · PiranhaDB
```

The comment updates in place on re-runs. No duplicate comments.

### bawbel.yml project config

Put a `bawbel.yml` in your repo root to set project-level defaults. The Action
reads it automatically - no need to repeat settings in every workflow file.

```yaml
# bawbel.yml
version: "1.0"

scan:
  recursive: true
  fail_on_severity: high     # critical | high | medium | low
  format: sarif              # text | json | sarif
  no_ignore: false
```

**Priority order (highest wins):**

```
action input (explicitly passed)
    ↑ overrides
bawbel.yml value
    ↑ overrides
action default
```

### .bawbelignore

The scanner automatically reads `.bawbelignore` from the scan root.
Use it to suppress entire paths — test fixtures, documentation with
intentional examples, generated files:

```
# .bawbelignore
docs/**
tests/fixtures/skills/clean/**
examples/**
```

No Action config needed. `.bawbelignore` is always active unless
`no-ignore: true` is set (audit mode).

### Inputs

| Input | Default | Description |
|---|---|---|
| `path` | `.` | File or directory to scan |
| `recursive` | `true` | Scan subdirectories |
| `fail-on-severity` | `high` | `critical` \| `high` \| `medium` \| `low` \| `none` |
| `format` | `sarif` | `sarif` \| `json` \| `text` |
| `no-ignore` | `false` | Bypass all suppressions (audit mode) |
| `comment-on-pr` | `true` | Post summary comment on pull requests |
| `github-token` | `""` | Required for PR comments. Use `secrets.GITHUB_TOKEN` |
| `version` | `latest` | `bawbel-scanner` version to install |
| `extras` | `all` | pip extras: `yara` \| `semgrep` \| `llm` \| `magika` \| `all` |

### Outputs

| Output | Description |
|---|---|
| `sarif-file` | Path to generated SARIF file |
| `findings-count` | Number of active findings |
| `toxic-flows-count` | Number of toxic flows detected |
| `risk-score` | Risk score 0.0 to 10.0 |
| `result` | `clean` or `findings` |

### Use outputs in subsequent steps

```yaml
- uses: bawbel/integrations@v2
  id: bawbel
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}

- name: Block on toxic flows
  if: steps.bawbel.outputs.toxic-flows-count > 0
  run: |
    echo "Toxic flows detected: ${{ steps.bawbel.outputs.toxic-flows-count }}"
    exit 1
```

### Disable PR comment

```yaml
- uses: bawbel/integrations@v2
  with:
    comment-on-pr: false
```

### Audit mode (see all findings including suppressed)

```yaml
- uses: bawbel/integrations@v2
  with:
    no-ignore: true
    github-token: ${{ secrets.GITHUB_TOKEN }}
```

---

## VS Code Extension

Real-time inline diagnostics as you write. Hover any squiggle for severity,
matched text, AVE ID, AIVSS score, and fix guidance. Right-click to suppress.

```bash
ext install bawbel.bawbel-scanner
```

**Features:**

- Inline squiggles on every finding — red (CRITICAL/HIGH) or yellow (MEDIUM/LOW)
- Hover tooltip: severity, match text, AVE ID, AIVSS score, how to fix
- Auto-scan on save (~25ms, pattern + YARA — never slows the editor)
- Full scan on demand — all engines (`Cmd+Alt+B`)
- Watch mode — background scanning scoped to file/folder/workspace
- Scan report — `bawbel report` output in a webview panel (`Cmd+Alt+R`)
- Right-click suppress — inserts justified `bawbel-ignore` comment with reason
- `suppressed_by` resolved from `git config user.name`
- Status bar: `Bawbel: ✓ clean` / `Bawbel: 3 finding(s)` / `👁 Bawbel: watching`

**Build from source:**

```bash
cd vscode/
npm install
npx vsce package --no-dependencies
code --install-extension bawbel-scanner-1.1.1.vsix
```

---

## Pre-commit

Block commits that introduce security findings before they reach CI.

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/bawbel/integrations
    rev: v2
    hooks:
      - id: bawbel-scan        # pattern engine only (~15ms per file)
```

All engines (slower, more thorough):

```yaml
repos:
  - repo: https://github.com/bawbel/integrations
    rev: v2
    hooks:
      - id: bawbel-scan-all
```

Custom severity threshold:

```yaml
repos:
  - repo: https://github.com/bawbel/integrations
    rev: v2
    hooks:
      - id: bawbel-scan
        args: ["--fail-on-severity", "critical"]
```

Local hook (air-gapped / no GitHub access):

```yaml
repos:
  - repo: local
    hooks:
      - id: bawbel-scan
        name: Bawbel Scanner
        entry: bawbel scan
        language: system
        types_or: [markdown, yaml, json]
        pass_filenames: true
        args: ["--fail-on-severity", "high"]
```

Setup:

```bash
pip install pre-commit
pre-commit install
pre-commit run bawbel-scan --all-files
```

Suppress a false positive inline:

```markdown
fetch https://internal.company.com  <!-- bawbel-ignore: bawbel-external-fetch -->
```

Skip for one commit:

```bash
git commit --no-verify
```

---

## GitLab CI

```yaml
# .gitlab-ci.yml
bawbel-scan:
  stage: test
  image: python:3.12-slim
  script:
    - pip install "bawbel-scanner[all]"
    - bawbel scan . --recursive --fail-on-severity high --format sarif
  artifacts:
    reports:
      sast: bawbel-results.sarif
    when: always
```

---

## Jenkins

```groovy
// Jenkinsfile
pipeline {
    agent { docker { image 'python:3.12-slim' } }
    stages {
        stage('Bawbel Security Scan') {
            steps {
                sh 'pip install "bawbel-scanner[all]"'
                sh 'bawbel scan . --recursive --fail-on-severity high'
            }
            post {
                always {
                    archiveArtifacts artifacts: 'bawbel-results.sarif',
                                     allowEmptyArchive: true
                }
            }
        }
    }
}
```

---

## CircleCI

```yaml
# .circleci/config.yml
version: 2.1
jobs:
  bawbel-scan:
    docker:
      - image: cimg/python:3.12
    steps:
      - checkout
      - run:
          name: Install Bawbel Scanner
          command: pip install "bawbel-scanner[all]"
      - run:
          name: Scan for AVE vulnerabilities
          command: bawbel scan . --recursive --fail-on-severity high
```

---

## Azure DevOps

```yaml
# azure-pipelines.yml
steps:
  - task: UsePythonVersion@0
    inputs:
      versionSpec: '3.12'

  - script: pip install "bawbel-scanner[all]"
    displayName: Install Bawbel Scanner

  - script: bawbel scan . --recursive --fail-on-severity high
    displayName: Scan for AVE vulnerabilities
```

---

## Bitbucket Pipelines

```yaml
# bitbucket-pipelines.yml
pipelines:
  pull-requests:
    '**':
      - step:
          name: Bawbel Security Scan
          image: python:3.12-slim
          script:
            - pip install "bawbel-scanner[all]"
            - bawbel scan . --recursive --fail-on-severity high
```

---

## Install

```bash
pip install bawbel-scanner                  # pattern engine only
pip install "bawbel-scanner[all]"           # all engines (recommended)
pip install "bawbel-scanner[yara,semgrep]"  # pattern + YARA + Semgrep
pip install "bawbel-scanner[llm]"           # + LLM semantic analysis
```

First scan:

```bash
bawbel scan ./skills/ --recursive
```

---

## Links

- [bawbel-scanner](https://github.com/bawbel/scanner) - CLI scanner
- [bawbel/ave](https://github.com/bawbel/ave) - AVE standard (48 records)
- [api.piranha.bawbel.io](https://api.piranha.bawbel.io) - threat intel API
- [bawbel.io/docs](https://bawbel.io/docs) - full documentation

---

Apache License 2.0