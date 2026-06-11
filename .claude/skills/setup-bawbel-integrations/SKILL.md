# setup-bawbel-integrations

Run once before using any other skill.

## Steps

1. Read CLAUDE.md — confirm three components, current task queue
2. Read LANGUAGE.md — confirm domain terms (Action, Extension, Hook)
3. Read ARCHITECTURE.md — confirm component map and CLI contract
4. Check docs/adr/ for decisions already made

## Install Matt Pocock's skills

```bash
npx skills@latest add mattpocock/skills/tdd
npx skills@latest add mattpocock/skills/to-prd
npx skills@latest add mattpocock/skills/to-issues
npx skills@latest add mattpocock/skills/grill-with-docs
npx skills@latest add mattpocock/skills/design-an-interface
npx skills@latest add mattpocock/skills/handoff
npx skills@latest add mattpocock/skills/zoom-out
```

## Key context

Three components, three languages:
- action.yml — shell + Python (tested via act or manual CI)
- vscode/ — TypeScript + Node.js (npm test)
- bawbel_hooks/ — Python (pytest tests/hooks/)

All three share one contract: bawbel scan --format json output shape.
If that shape changes in bawbel/scanner, all three need updating.
