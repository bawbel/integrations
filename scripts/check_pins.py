#!/usr/bin/env python3
"""Check that every action and pre-commit reference in this repo is pinned by commit SHA.

A tag can be moved, a commit SHA cannot. This repo ships an action that tells people to
scan their supply chain, so its own workflows and docs pin what they use (RELEASING.md).

Checked files: .github/workflows, README.md, examples, bawbel_hooks/README.md,
.pre-commit-hooks.yaml. Checked lines:

  uses: owner/repo[/path]@REF   REF must be 40 lowercase hex characters
  rev: REF                      same rule

and each needs a trailing comment that names the release, `# v1.1.0` or `# frozen: v1.1.0`.
Not checked: local actions (`uses: ./...`) and docker:// references.

Pre-commit snippets (a `repos:` block in a yaml fence of a checked file, or in the comment
header of .pre-commit-hooks.yaml) are read entry by entry, with `repo:` and `rev:` in any order:

  repo: URL                     must be https://github.com/bawbel/integrations, or `local`/`meta`
  rev: REF                      a remote entry needs one; its SHA must be the commit of the tag
                                named in its comment, as for a `uses:` of this repo's own action

Two escapes, both visible in the output:

  # pin-exempt: <reason>    on the same line. For a job that tests a moving tag on purpose.
  @<release-commit-sha>     the literal placeholder, for a component that no release
                            contains yet. Listed so the release PR can fill them in.

A reference to this repo's own action (`bawbel/integrations`), and the `rev:` of a snippet
entry for this repo, is also compared with the tag its comment names: the tag must exist here
and resolve to that SHA. That needs the tags, so CI checks out with fetch-depth 0.

Exit 0: all pinned. Exit 1: at least one line failed. Exit 2: could not run.
"""

import argparse
import re
import subprocess  # nosec B404 # noqa: S404 -- runs git on this repo
import sys
from pathlib import Path

OWN_ACTION = "bawbel/integrations"
CANONICAL_REPO = f"https://github.com/{OWN_ACTION}"
LOCAL_REPOS = ("local", "meta")
CHECKED = (
    ".github/workflows/*.yml",
    ".github/workflows/*.yaml",
    "README.md",
    "examples/**/*.yml",
    "examples/**/*.yaml",
    "bawbel_hooks/README.md",
    ".pre-commit-hooks.yaml",
)
PLACEHOLDER = "<release-commit-sha>"
EXEMPT_MARK = "pin-exempt:"

SHA = re.compile(r"^[0-9a-f]{40}$")
USES = re.compile(r"^\s*#?\s*(?:-\s*)?uses:\s*(?P<ref>\S+)\s*(?:#\s*(?P<note>.*))?$")
REV = re.compile(r"^\s*#?\s*rev:\s*(?P<ref>\S.*?)\s*(?:#\s*(?P<note>.*))?$")
RELEASE_NOTE = re.compile(r"^(?:frozen:\s*)?(?P<tag>v\d+(?:\.\d+){0,2})\s*$")
FENCE = re.compile(r"^\s*```\s*(?P<language>[\w-]*)\s*$")
REPOS_KEY = re.compile(r"^(?P<indent>\s*)repos:\s*$")
DASH = re.compile(r"^(?P<indent>\s*)-(?:\s|$)")
SNIPPET_KEY = re.compile(r"^\s*(?:-\s+)?(?P<key>repo|rev):\s*(?P<value>[^#\s][^#]*?)\s*(?:#\s*(?P<note>.*))?$")


def tag_commit(root: Path, tag: str) -> str | None:
    """The commit a tag points at in this repo, or None when the tag is not there."""
    out = subprocess.run(  # nosec B603 B607 # noqa: S603 S607 -- fixed argv, no shell
        ["git", "-C", str(root), "rev-parse", "--verify", "--quiet", f"refs/tags/{tag}^{{commit}}"],
        capture_output=True,
        text=True,
        check=False,
    )
    return out.stdout.strip() or None


def check_line(root: Path, text: str) -> tuple[str, str] | None:
    """Return ('error' | 'placeholder', message) for one line, or None when it is fine."""
    match = USES.match(text) or REV.match(text)
    if not match:
        return None
    ref, note = match.group("ref"), (match.group("note") or "").strip()
    is_uses = bool(USES.match(text))

    if note.startswith(EXEMPT_MARK):
        return None
    if is_uses:
        if ref.startswith(("./", "docker://")) or "@" not in ref:
            return None
        action, _, pin = ref.rpartition("@")
    else:
        action, pin = "", ref

    if pin == PLACEHOLDER:
        return ("placeholder", f"{ref}: fill in when a release contains it")
    if not SHA.match(pin):
        return ("error", f"{ref}: pin to a 40-character commit SHA, not '{pin}'")
    release = RELEASE_NOTE.match(note)
    if not release:
        return ("error", f"{ref}: add the release as a trailing comment, '# v1.2.3'")
    if action == OWN_ACTION or action.startswith(OWN_ACTION + "/"):
        resolved = tag_commit(root, release.group("tag"))
        if resolved is None:
            return ("error", f"{ref}: tag {release.group('tag')} is not in this checkout")
        if resolved != pin:
            return ("error", f"{ref}: tag {release.group('tag')} is {resolved}, not {pin}")
    return None


def snippet_blocks(path: Path, lines: list[str]) -> list[list[tuple[int, str]]]:
    """The lines of each `repos:` block under its `repos:` line, as (line number, text) pairs.

    A block is read from a yaml fence (also an indented one) in any checked file, or from the
    comment header of a yaml file, where the leading `# ` is dropped. Other fences are skipped.
    """
    unfenced_yaml = path.suffix in (".yml", ".yaml")
    blocks: list[list[tuple[int, str]]] = []
    language: str | None = None  # None outside a fence, else the fence language
    current: list[tuple[int, str]] | None = None
    base = 0
    for number, raw in enumerate(lines, start=1):
        fence = FENCE.match(raw)
        if fence:
            language = None if language is not None else fence.group("language").lower()
            current = None
            continue
        if language is None and unfenced_yaml:
            if not raw.lstrip().startswith("#"):
                current = None
                continue
            text = re.sub(r"^(\s*)#[ ]?", r"\1", raw)
        elif language in ("yaml", "yml"):
            text = raw
        else:
            continue
        opener = REPOS_KEY.match(text)
        if opener and current is None:
            current, base = [], len(opener.group("indent"))
            blocks.append(current)
        elif current is not None:
            if text.strip() and len(text) - len(text.lstrip()) <= base:
                current = None
            else:
                current.append((number, text))
    return blocks


def snippet_errors(root: Path, path: Path, lines: list[str]) -> list[tuple[int, str]]:
    """(line number, message) for each pre-commit snippet entry that names the wrong repository,
    has no rev, or has a SHA that is not the commit of its release tag."""
    found: list[tuple[int, str]] = []
    for block in snippet_blocks(path, lines):
        dashes = [(n, DASH.match(t)) for n, t in block if DASH.match(t)]
        if not dashes:
            continue
        item = min(len(m.group("indent")) for _, m in dashes)
        starts = [n for n, m in dashes if len(m.group("indent")) == item]
        for index, start in enumerate(starts):
            stop = starts[index + 1] if index + 1 < len(starts) else block[-1][0] + 1
            keys: dict[str, tuple[int, str, str]] = {}
            for n, text in block:
                match = SNIPPET_KEY.match(text) if start <= n < stop else None
                if match and match.group("key") not in keys:
                    keys[match.group("key")] = (
                        n,
                        match.group("value").strip("\"'"),
                        (match.group("note") or "").strip(),
                    )
            if "repo" not in keys or keys["repo"][1] in LOCAL_REPOS:
                continue
            repo_line, repo, _ = keys["repo"]
            if repo != CANONICAL_REPO:
                found.append((repo_line, f"{repo}: the repository is {CANONICAL_REPO}"))
            if "rev" not in keys:
                found.append((start, f"{repo}: no rev"))
            elif repo == CANONICAL_REPO:
                rev_line, rev, note = keys["rev"]
                release = RELEASE_NOTE.match(note)
                if SHA.match(rev) and release:  # a bad rev or comment is reported per line
                    resolved = tag_commit(root, release.group("tag"))
                    if resolved is None:
                        found.append((rev_line, f"{rev}: tag {release.group('tag')} is not in this checkout"))
                    elif resolved != rev:
                        found.append((rev_line, f"{rev}: tag {release.group('tag')} is {resolved}, not {rev}"))
    return found


def checked_files(root: Path) -> list[Path]:
    found: set[Path] = set()
    for pattern in CHECKED:
        found.update(p for p in root.glob(pattern) if p.is_file())
    return sorted(found)


def run(root: Path) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    placeholders: list[str] = []
    for path in checked_files(root):
        lines = path.read_text(encoding="utf-8").splitlines()
        for number, text in enumerate(lines, start=1):
            verdict = check_line(root, text)
            if verdict is None:
                continue
            where = f"{path.relative_to(root)}:{number}"
            (errors if verdict[0] == "error" else placeholders).append(f"{where}: {verdict[1]}")
        for number, message in snippet_errors(root, path, lines):
            errors.append(f"{path.relative_to(root)}:{number}: {message}")
    return errors, placeholders


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parent.parent)
    args = parser.parse_args(argv)
    if not args.root.is_dir():
        print(f"error: {args.root} is not a directory", file=sys.stderr)
        return 2

    errors, placeholders = run(args.root)
    for line in placeholders:
        print(f"placeholder  {line}")
    for line in errors:
        print(f"not pinned   {line}")
    if errors:
        print(f"{len(errors)} reference(s) not pinned", file=sys.stderr)
        return 1
    print(f"all references pinned ({len(placeholders)} placeholder(s) to fill at release)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
