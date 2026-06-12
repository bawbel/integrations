# ADR-0003: VS Code extension GracefulDegradation

Status: Accepted
Date: 2026-05-24

## Decision

The VS Code extension must never crash or show an error if bawbel is not
installed. On activation: check for bawbel CLI, set StatusBarItem to
"Bawbel: not installed", offer to run pip install. Do not throw.

## Consequences

Positive: extension installs cleanly before bawbel is installed.
Positive: clear onboarding message instead of a cryptic error.
Negative: slightly more conditional logic in activation path.
