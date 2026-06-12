# git-guardrails — integrations

Block dangerous commands. Ask before: push --force, reset --hard,
clean -fd, rebase -i on pushed commits.

## Before every commit

pytest tests/ -x -q
cd vscode && npm test
ruff check bawbel_hooks/
cd vscode && npm run lint

## Release checklist

- [ ] action.yml version in README matches tag
- [ ] vscode/package.json version matches tag
- [ ] CHANGELOG.md updated
- [ ] bawbel-scanner constraint in action.yml is current
