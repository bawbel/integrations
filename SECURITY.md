# Security Policy

## Reporting a vulnerability

**Do not open a public issue.** Report privately, using either:

- GitHub private vulnerability reporting: the "Report a vulnerability" button under this
  repository's Security tab.
- Email: **bawbel.io@gmail.com**, subject `SECURITY: bawbel-integrations [brief description]`.

Include the component, the version or action ref, and the steps or workflow that reproduce it.

## Scope

In scope: this repository.

- The GitHub Action (`action.yml`)
- The pre-commit hook (`bawbel_hooks/`, `.pre-commit-hooks.yaml`)
- The VS Code extension (`vscode/`)
- The CI examples (`examples/`)

Out of scope, report to the relevant repository instead:

- Detection rules, false positives, and missed findings: [bawbel/scanner](https://github.com/bawbel/scanner)
- AVE record content or the AVE schema: [bawbel/ave](https://github.com/bawbel/ave)
