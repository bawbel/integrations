# ADR-0001: SARIF to Security Tab only — no code injection

Status: Accepted
Date: 2026-05-24

## Decision

The GitHub Action and bawbel-mcp post findings to the GitHub Security Tab
via SARIF upload only. No automated code changes, no unsolicited PRs,
no code mutation in contributor repos.

## Consequences

Positive: zero legal risk, zero maintainer friction, native GitHub UX.
Negative: developers must act on findings manually after reviewing alerts.
