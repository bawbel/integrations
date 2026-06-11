# tdd — bawbel/integrations

Red-green-refactor. One behavior at a time.
Three languages — three testing approaches.

## Python (bawbel_hooks/)

```bash
pytest tests/hooks/test_pre_commit.py::test_name -x -q  # FAIL
# implement
pytest tests/hooks/test_pre_commit.py::test_name -x -q  # PASS
pytest tests/ -x -q                                       # full suite
```

## TypeScript (vscode/)

```bash
cd vscode/
npm test -- --grep "test name"  # FAIL
# implement
npm test -- --grep "test name"  # PASS
npm test                         # full suite
```

## What/Why/How — mandatory on every function

Python:
```python
# What: posts or updates a Bawbel scan summary comment on a pull request
# Why:  re-running a scan should update existing comment, not create noise
# How:  lists PR comments, finds "Bawbel Scanner", PATCHes or POSTs
def post_pr_comment(token, repo, pr_number, body):
    ...
```

TypeScript:
```typescript
// What: converts a bawbel severity string to VS Code DiagnosticSeverity
// Why:  VS Code requires its own enum, not bawbel string values
// How:  switch on severity string, defaults to Warning for unknown values
function toVSCodeSeverity(severity: string): vscode.DiagnosticSeverity {
    ...
}
```

Write the comment BEFORE writing the function body.

## Test naming

test_[component]_[behavior]_when_[condition]

## Key rule

Tests must NOT call the real bawbel CLI.
Mock the subprocess call or use fixture JSON files.
