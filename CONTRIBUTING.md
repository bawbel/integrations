# Contributing to bawbel/integrations

## Read first

1. CLAUDE.md — architecture rules and current task queue
2. LANGUAGE.md — use these exact names
3. ARCHITECTURE.md — component map and CLI contract

## Setup

```bash
git clone https://github.com/bawbel/integrations
cd integrations

# GitHub Action tests
pip install pytest
pytest tests/ -q

# VS Code Extension
cd vscode/
npm install
npm test

# Pre-commit hooks
cd bawbel_hooks/
pip install -e ".[dev]"
pytest tests/hooks/ -q
```

## What to work on

Open issues: github.com/bawbel/integrations/issues

Easiest first contributions:
- Add a CI platform example in `examples/` (any platform not yet covered)
- Add a test for an existing action.yml step in `tests/action/`
- Fix a VS Code Extension bug with a failing test

## How to contribute

```bash
git checkout -b fix/issue-N-description
# Write the failing test first
# Write minimum code to pass
# Run: pytest tests/ -q && cd vscode && npm test
git commit -m "[issue-N] description"
```

## What/Why/How on every function

```python
# What: formats the PR comment body from scan result data
# Why:  comment structure must be consistent across re-runs so the
#       update-in-place logic can identify the Bawbel comment reliably
# How:  builds markdown table from findings list, caps at 5 per file
def format_pr_comment(findings_count, toxic_count, risk_score, findings):
    ...
```

```typescript
// What: maps a bawbel severity string to a VS Code DiagnosticSeverity
// Why:  VS Code requires its own enum, not the bawbel string values
// How:  switch on severity string, defaults to Warning for unknown values
function toVSCodeSeverity(severity: string): vscode.DiagnosticSeverity {
    ...
}
```

Write the comment before the function body. If you cannot answer all three,
the scope is unclear — redesign before writing code.

## Key rules

- This repo wraps the `bawbel` CLI — never import scanner internals directly
- SARIF goes to Security Tab only — never post raw findings as code comments
- PR comment updates in-place — never create duplicate comments
- VS Code extension must survive `bawbel` not being installed
- All names from LANGUAGE.md
