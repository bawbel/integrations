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

A component that no release contains yet is documented with the placeholder
`<release-commit-sha>`. The checker lists each one so the release PR can fill them in.
Dependabot (`.github/dependabot.yml`) updates the pins in workflows every week. It does not
edit the README or `examples/`.

## Cutting a release

1. `develop` is green: `Action tests (working tree)`, `Gate lint action tests (working tree)`
   and `Pins`. The README matches `action.yml` and `gate-lint/action.yml`.
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
