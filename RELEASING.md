# Releases and pinning

How `bawbel/integrations` is released and what its tags mean. Maintainers cut releases.
Nothing here runs by itself.

## Tags

| Tag | Meaning | Moves? |
|---|---|---|
| `vX.Y.Z` (for example `v1.1.0`) | One release | Never. A release tag is not moved, deleted, or re-pointed. A bad release is fixed by a new patch release. |
| `vX` (for example `v1`) | The newest `vX.Y.Z` release of that major version | Yes, and only as described below |

`v1` moves only to a `v1.Y.Z` release tag, and only after the release steps below have passed.
It never moves to a commit that is not a tagged release, and never to a different major
version. If a release turns out to be bad, `v1` moves back to the last good release tag, a
patch release follows, and the release notes say so.

A change that breaks existing workflows is a new major version (`v2`), and `v1` stays where
it is. That covers renaming or removing an input or an output, and changing a default so that
a passing workflow fails or the other way round.

## Pinning, for people who use the action

Pin to the commit SHA of a release and write the release in a trailing comment:

```yaml
- uses: bawbel/integrations@ee77de3c8fb927a41ca9d8d5f51be22215978d14 # v1.1.0
```

```bash
gh api repos/bawbel/integrations/commits/v1.1.0 --jq .sha
```

`v1` is for trying the action. It changes under you by design.

## This repository's own workflows

Every `uses:` and `rev:` in `.github/workflows/`, `README.md`, `examples/`,
`bawbel_hooks/README.md`, and `.pre-commit-hooks.yaml` is a 40-character commit SHA with the
release in a trailing comment. `scripts/check_pins.py` enforces that in CI (the `Pins`
workflow). It also checks that a SHA written for this repo's own action is the commit its
comment's tag points to. It does not compare third-party SHAs with their upstream tags.

There is one exception: `.github/workflows/action-smoke.yml` runs the public `v1` tag on
purpose, because it tests what a user who copies `@v1` gets. The line carries
`# pin-exempt: <reason>`.

The checker skips a `# pin-exempt:` line only when all of these hold: the reason is at least
10 characters, the line is a `uses:` line, and its file and exact `uses:` target are listed
in `EXEMPT_ALLOWLIST` in `scripts/check_pins.py`. Today that is one entry,
`bawbel/integrations@v1` in `.github/workflows/action-smoke.yml`. Any other `# pin-exempt:`
fails the `Pins` workflow, and the message names the line and the allowlist. To add an
exemption, open a pull request that adds an entry to `EXEMPT_ALLOWLIST`. That is an edit to
the checker, which `.github/CODEOWNERS` assigns to the maintainer like every other path, so
the exemption is reviewed there and not decided by a comment on a workflow line.

A component that no release contains yet is documented with the placeholder
`<release-commit-sha>`. The checker lists each one so the release PR can fill them in.
Dependabot (`.github/dependabot.yml`) updates the pins in workflows every week. It does not
edit the README or `examples/`.

Dependabot version-update pull requests base on `develop`, because `.github/dependabot.yml`
sets `target-branch: develop`. Dependabot security-update pull requests do not. GitHub
documents that "security updates always use the default branch for the repository" (the
`target-branch` section of the [Dependabot options
reference](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference)),
and the default branch here is `main`. So a security-update pull request bases on `main`.
Before merging one, change its base branch to `develop` by hand, so that it reaches `main`
through the normal `develop` to `main` promotion and does not leave `main` with a commit
`develop` lacks.

## Cutting a release

1. `develop` is green: `Action tests (working tree)`, `Gate lint action tests (working tree)`,
   `Hook tests` and `Pins`. The README matches `action.yml` and `gate-lint/action.yml`.
2. Promote `develop` to `main` with a pull request that a person reviews.
3. Tag the merge commit on `main` as `vX.Y.Z` and push the tag. Write the release notes:
   what changed, and anything that makes a workflow behave differently.
4. Move the major tag to it:
   `git tag -f v1 vX.Y.Z && git push --force origin refs/tags/v1`
5. Run `Action smoke test` from the Actions tab. It uses the public `v1`. If it fails, move
   `v1` back to the previous release, then fix forward with a patch release.
6. Open a docs pull request that sets the SHA in `README.md` and `examples/` to the new
   release, and fills in any `<release-commit-sha>` placeholder. Run
   `python scripts/check_pins.py` first: it names every line to change and rejects a SHA that
   does not match its tag.
7. Refresh the example pins. Dependabot bumps the workflows but not `README.md` or
   `examples/`, so their `actions/checkout` pin falls behind. Set them to the version the
   workflows use, after confirming its SHA against the tag
   (`gh api repos/actions/checkout/commits/vX.Y.Z --jq .sha`). Then run
   `git grep -h -o -E 'actions/checkout@[0-9a-f]{40} # v[0-9.]+' -- README.md examples .github | sort -u`
   to list each distinct `actions/checkout` pin in use. It should list one.

## Extension releases

The VS Code extension has its own tags, `vscode-vX.Y.Z`, and its own workflow,
`.github/workflows/vscode-release.yml`. Nothing is published to the Marketplace or Open VSX from
CI: no publisher token is stored.

1. Set `version` in `vscode/package.json` (and `vscode/CHANGELOG.md`) in a pull request, and
   promote it to `main` like any other change.
2. Optional dry run: Actions tab, `VS Code release`, Run workflow. It builds the `.vsix` and
   keeps it as a workflow artifact. It never creates a Release or an attestation, also when it is
   run on a tag.
3. Tag the commit on `main` as `vscode-vX.Y.Z` and push the tag. The workflow fails unless
   `X.Y.Z` equals the version in `vscode/package.json`. It then builds the `.vsix`, attests it
   and attaches it to a Release for the tag.
4. Download the file, check it with `gh attestation verify <file> --repo bawbel/integrations`
   (it shows where and how the file was built, not that the extension is trustworthy), and
   install it with `code --install-extension`.
5. Publish the `.vsix` to the Marketplace and Open VSX by hand.

The Node version in `vscode-release.yml` is exact. Dependabot does not read it: bump it in a
reviewed change, together with `.github/workflows/vscode.yml` if you want them to match.
