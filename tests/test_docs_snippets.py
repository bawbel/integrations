"""Tests for the pre-commit snippets in README.md and bawbel_hooks/README.md.

Standard library only: python -m unittest discover -s tests -p "test_docs_snippets.py"

A wrong `repo:` or `rev:` in a snippet is found only by a user who pastes it. Every snippet
that starts with `repos:` must name the canonical repository, and every `rev:` must be the
`<release-commit-sha>` placeholder or a 40-character commit SHA (RELEASING.md). That a SHA
matches the release tag in its comment is checked by scripts/check_pins.py, not here.
"""

import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOC_FILES = ("README.md", "bawbel_hooks/README.md")
CANONICAL_REPO = "https://github.com/bawbel/integrations"
PLACEHOLDER = "<release-commit-sha>"

SHA = re.compile(r"^[0-9a-f]{40}$")
FENCE = re.compile(r"^```ya?ml[ \t]*\n(?P<body>.*?)^```[ \t]*$", re.DOTALL | re.MULTILINE)
REPOS_KEY = re.compile(r"^repos:[ \t]*$", re.MULTILINE)
REPO = re.compile(r"^[ \t]*-[ \t]*repo:[ \t]*(?P<value>\S+)", re.MULTILINE)
REV = re.compile(r"^[ \t]*rev:[ \t]*(?P<value>\S+)", re.MULTILINE)


def snippets(text: str) -> list[str]:
    """The bodies of the fenced yaml blocks that are a .pre-commit-config.yaml snippet."""
    return [m.group("body") for m in FENCE.finditer(text) if REPOS_KEY.search(m.group("body"))]


def problems(snippet: str) -> list[str]:
    """What is wrong with one snippet. `repo: local` entries have no rev and are skipped."""
    found: list[str] = []
    entries = list(REPO.finditer(snippet))
    for i, entry in enumerate(entries):
        repo = entry.group("value")
        if repo == "local":
            continue
        end = entries[i + 1].start() if i + 1 < len(entries) else len(snippet)
        if repo != CANONICAL_REPO:
            found.append(f"repo {repo} is not {CANONICAL_REPO}")
        rev = REV.search(snippet, entry.end(), end)
        if rev is None:
            found.append(f"{repo}: no rev")
        elif rev.group("value") != PLACEHOLDER and not SHA.match(rev.group("value")):
            found.append(
                f"{repo}: rev {rev.group('value')} is neither {PLACEHOLDER} nor a 40-character SHA"
            )
    return found


def wrap(body: str) -> str:
    """A markdown document with one yaml fence around body."""
    return f"text\n\n```yaml\n{body}```\n\nmore text\n"


GOOD = f"repos:\n  - repo: {CANONICAL_REPO}\n    rev: {PLACEHOLDER}  # frozen: <release tag>\n"
SHA_A = "11d5960a326750d5838078e36cf38b85af677262"


class DocSnippets(unittest.TestCase):
    """The real docs."""

    def test_each_doc_has_a_snippet_to_check(self):
        # If the extractor silently finds nothing, the next test would pass for the wrong reason.
        for name in DOC_FILES:
            text = (ROOT / name).read_text(encoding="utf-8")
            body = "\n".join(snippets(text))
            remote = [m for m in REPO.finditer(body) if m.group("value") != "local"]
            self.assertTrue(remote, f"{name}: no pre-commit snippet with a remote repo found")

    def test_doc_snippets_name_the_canonical_repo_and_pin_rev(self):
        for name in DOC_FILES:
            text = (ROOT / name).read_text(encoding="utf-8")
            for body in snippets(text):
                self.assertEqual(problems(body), [], f"{name}")


class Checker(unittest.TestCase):
    """The checker itself: it must accept a good snippet and reject each kind of bad one."""

    def test_good_snippet_passes(self):
        self.assertEqual(problems(GOOD), [])

    def test_sha_with_release_comment_passes(self):
        snippet = f"repos:\n  - repo: {CANONICAL_REPO}\n    rev: {SHA_A}  # v1.1.0\n"
        self.assertEqual(problems(snippet), [])

    def test_local_repo_passes_without_a_rev(self):
        self.assertEqual(problems("repos:\n  - repo: local\n    hooks: []\n"), [])

    def test_old_repo_name_is_rejected(self):
        old = GOOD.replace("bawbel/integrations", "bawbel/bawbel-integrations")
        self.assertEqual(len(problems(old)), 1)
        self.assertIn("bawbel-integrations", problems(old)[0])

    def test_a_moving_tag_as_rev_is_rejected(self):
        for tag in ("v1", "v1.1.0", "main"):
            snippet = f"repos:\n  - repo: {CANONICAL_REPO}\n    rev: {tag}\n"
            self.assertEqual(len(problems(snippet)), 1, tag)

    def test_a_short_sha_is_rejected(self):
        snippet = f"repos:\n  - repo: {CANONICAL_REPO}\n    rev: {SHA_A[:12]}\n"
        self.assertEqual(len(problems(snippet)), 1)

    def test_missing_rev_is_rejected(self):
        snippet = f"repos:\n  - repo: {CANONICAL_REPO}\n    hooks:\n      - id: bawbel-scan\n"
        self.assertEqual(problems(snippet), [f"{CANONICAL_REPO}: no rev"])

    def test_each_entry_is_checked_on_its_own(self):
        # The second entry has no rev of its own: the first entry's rev must not cover it.
        snippet = GOOD + f"  - repo: {CANONICAL_REPO}\n    hooks:\n      - id: bawbel-scan-all\n"
        self.assertEqual(problems(snippet), [f"{CANONICAL_REPO}: no rev"])

    def test_only_yaml_fences_with_a_repos_key_are_snippets(self):
        other_language = "```bash\nrepos:\n  - repo: https://example.invalid/x\n```\n"
        no_repos_key = "```yaml\nname: Gate manifest lint\non: [pull_request]\n```\n"
        self.assertEqual(snippets(other_language + no_repos_key), [])
        self.assertEqual(len(snippets(wrap(GOOD))), 1)


if __name__ == "__main__":
    unittest.main()
