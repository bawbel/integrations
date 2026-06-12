# to-issues — integrations

Break PRD into independently-completable GitHub issues.
One behavior, one test, one component, completable in < 90 min.

## Component ordering

For features touching multiple components:
1. bawbel_hooks/ (Python — fastest to test)
2. action.yml (shell — medium)
3. vscode/ (TypeScript — most complex)

## Issue body additions

Add to every issue:
Component: vscode/
Test command: cd vscode && npm test -- --grep "test name"
