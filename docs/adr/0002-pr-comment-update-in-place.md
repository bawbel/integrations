# ADR-0002: PR comment updates in-place

Status: Accepted
Date: 2026-05-24

## Decision

The PR comment bot checks for an existing comment containing "Bawbel Scanner"
before posting. If found, it PATCHes (updates) it. If not found, it POSTs a new one.
Result: exactly one Bawbel comment per PR, regardless of re-runs.

## Consequences

Positive: clean PR thread, no comment spam on re-runs.
Negative: if someone edits the comment body to remove "Bawbel Scanner",
the next run will create a duplicate. Acceptable edge case.
