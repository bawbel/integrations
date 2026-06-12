# design-an-interface — integrations

Three parallel designs, pick the deepest.

## For GitHub Action inputs

Design A: minimal — least the caller must know
Design B: explicit — every option surfaced
Design C: config-file-first — bawbel.yml drives, inputs are overrides

## For VS Code TypeScript

Design A: scan() returns everything, caller renders
Design B: scan() + diagnose(), caller assembles
Design C: event-driven — scan emits, providers subscribe

## Constraints

- Action inputs must have sensible defaults (most repos: zero config)
- TypeScript interfaces must match bawbel JSON contract exactly
- No input requiring caller to know bawbel internals
- GracefulDegradation: every module handles missing bawbel CLI
