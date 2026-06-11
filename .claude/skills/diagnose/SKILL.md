# diagnose — integrations

Reproduce → Minimize → Hypothesize → Fix.

## Component-specific

action.yml not reading bawbel.yml:
  Check: does bawbel.yml exist in the scanned repo?
  Check: is step output read correctly (${{ steps.config.outputs.* }})?

VS Code not showing diagnostics:
  Check: is bawbel installed? (which bawbel)
  Check: is file type in activationEvents?
  Run: bawbel scan <file> --format json in terminal to check output.

Pre-commit wrong exit code:
  Check: what does bawbel scan return for the test file?
  Run: python bawbel_pre_commit.py <test_file> directly.

## Standard loop

Reproduce → Minimize (5-15 lines) → Hypothesize (ONE hypothesis) →
Confirm → Fix (1-5 lines) → Verify (test + full suite) →
Regression test → Remove debug output → WHY comment.
