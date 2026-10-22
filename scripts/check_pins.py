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

Two escapes, both visible in the output:

  # pin-exempt: <reason>    on the same line. For a job that tests a moving tag on purpose.
  @<release-commit-sha>     the literal placeholder, for a component that no release
                            contains yet. Listed so the release PR can fill them in.

A reference to this repo's own action (`bawbel/integrations`) is also compared with the
tag its comment names: the tag must exist here and resolve to that SHA. That needs the
tags, so CI checks out with fetch-depth 0.

Exit 0: all pinned. Exit 1: at least one line failed. Exit 2: could not run.
"""

import argparse
import re
import subprocess  # nosec B404 # noqa: S404 -- runs git on this repo
import sys
from pathlib import Path

OWN_ACTION = "bawbel/integrations"
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


def checked_files(root: Path) -> list[Path]:
    found: set[Path] = set()
    for pattern in CHECKED:
        found.update(p for p in root.glob(pattern) if p.is_file())
    return sorted(found)


def run(root: Path) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    placeholders: list[str] = []
    for path in checked_files(root):
        for number, text in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
            verdict = check_line(root, text)
            if verdict is None:
                continue
            where = f"{path.relative_to(root)}:{number}"
            (errors if verdict[0] == "error" else placeholders).append(f"{where}: {verdict[1]}")
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
