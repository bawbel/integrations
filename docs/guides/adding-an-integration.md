# Adding a New CI/CD Integration

## Steps

1. Create `examples/[platform].yml` with a minimal working example
2. Follow the pattern in existing examples (install, scan, fail-on-severity)
3. Add a row to the integrations table in README.md
4. No test required for examples — they are reference configs

## Minimum viable example

```yaml
# Install bawbel
pip install "bawbel-scanner[all]"

# Scan
bawbel scan . --recursive --fail-on-severity high

# Upload SARIF if platform supports it
# (see examples/github-actions.yml for SARIF upload pattern)
```

## What NOT to do

Do not add automated PR injection or code mutation.
Do not add unsolicited comment posting (only GitHub Action does this,
and only on pull_request events with explicit github-token).
