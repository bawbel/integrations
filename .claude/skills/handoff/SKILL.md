# handoff — integrations

End of session: write docs/agents/handoffs/YYYY-MM-DD-HHMM.md
Start of session: read most recent, run tests.

## End format

# Handoff — YYYY-MM-DD HH:MM

## Completed
- action.yml:L45-L80 — bawbel.yml config step added
- tests/action/test_config_loading.sh — 3 tests

## Test status
pytest tests/ -q     → N passed
cd vscode && npm test → N passed

## Next action
Component: vscode/
File: vscode/src/panels/AIVSSPanel.ts
Test to write first:
```typescript
it('shows AIVSS score from finding', () => {
    const finding = makeFinding({ aivss_score: 8.4 });
    expect(renderPanel(finding)).toContain('8.4');
});
```

## Open questions
- Does AIVSSPanel need PiranhaDB or just local finding data?

Note: docs/agents/handoffs/ is gitignored.
