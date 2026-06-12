# grill-with-docs — integrations

Grilling before design. No code until complete.

## Pre-check questions (integrations-specific)

Q0: Which component? action.yml / vscode/ / bawbel_hooks/ / all three?
    If all three: probably too large — split the scope.

Q1: Does this change the bawbel CLI JSON contract?
    If yes: coordinate with bawbel/scanner first.

Q2: Which language and test framework?
    Python → pytest / TypeScript → npm test / shell → bash

Q3: Does this affect the three ADRs?
    ADR-0001: SARIF only, no code injection
    ADR-0002: PR comment updates in-place
    ADR-0003: VS Code GracefulDegradation

## Standard questions

Q4: One sentence — what does this change do?
Q5: What does "done" look like? How do you verify it?
Q6: What breaks if bawbel is not installed?
Q7: What breaks if the bawbel JSON shape changes?
Q8: What is the first failing test name?

## End of grilling

Summary, interface, LANGUAGE.md additions, ADR if needed, first test.
Next: /to-prd
