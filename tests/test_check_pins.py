"""Tests for scripts/check_pins.py. Standard library only: python -m unittest discover tests"""

import subprocess  # nosec B404 # noqa: S404 -- builds a throwaway git repo
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

import check_pins  # noqa: E402

SHA_A = "11d5960a326750d5838078e36cf38b85af677262"
SHA_B = "ee77de3c8fb927a41ca9d8d5f51be22215978d14"


def git(root: Path, *args: str) -> str:
    out = subprocess.run(  # nosec B603 B607 # noqa: S603 S607 -- fixed argv, no shell
        ["git", "-C", str(root), *args], capture_output=True, text=True, check=True
    )
    return out.stdout.strip()


def make_repo(root: Path) -> str:
    """A repo with one commit tagged v1.1.0. Returns the commit SHA."""
    git(root, "init", "-q")
    git(root, "config", "user.email", "t@example.invalid")
    git(root, "config", "user.name", "t")
    (root / "f").write_text("x")
    git(root, "add", "f")
    git(root, "commit", "-q", "-m", "c")
    sha = git(root, "rev-parse", "HEAD")
    git(root, "update-ref", "refs/tags/v1.1.0", sha)
    return sha


class TestCheckLine(unittest.TestCase):
    def verdict(self, text, root=ROOT):
        return check_pins.check_line(root, text)

    def test_pinned_with_release_comment_passes(self):
        self.assertIsNone(self.verdict(f"      - uses: actions/checkout@{SHA_A} # v4.4.0"))

    def test_pinned_step_with_name_key_passes(self):
        self.assertIsNone(self.verdict(f"        uses: github/codeql-action/upload-sarif@{SHA_A} # v3.39.0"))

    def test_moving_tag_fails(self):
        kind, message = self.verdict("      - uses: actions/checkout@v4")
        self.assertEqual(kind, "error")
        self.assertIn("40-character commit SHA", message)

    def test_branch_ref_fails(self):
        self.assertEqual(self.verdict("      - uses: actions/checkout@main")[0], "error")

    def test_short_sha_fails(self):
        self.assertEqual(self.verdict(f"      - uses: actions/checkout@{SHA_A[:12]} # v4.4.0")[0], "error")

    def test_uppercase_sha_fails(self):
        self.assertEqual(
            self.verdict(f"      - uses: actions/checkout@{SHA_A.upper()} # v4.4.0")[0], "error"
        )

    def test_missing_release_comment_fails(self):
        kind, message = self.verdict(f"      - uses: actions/checkout@{SHA_A}")
        self.assertEqual(kind, "error")
        self.assertIn("trailing comment", message)

    def test_comment_that_is_not_a_release_fails(self):
        self.assertEqual(self.verdict(f"      - uses: actions/checkout@{SHA_A} # latest")[0], "error")

    def test_local_action_is_skipped(self):
        self.assertIsNone(self.verdict("        uses: ./"))
        self.assertIsNone(self.verdict("        uses: ./gate-lint"))

    def test_docker_reference_is_skipped(self):
        self.assertIsNone(self.verdict("        uses: docker://alpine:3.20"))

    def test_exempt_mark_skips_with_a_reason(self):
        self.assertIsNone(
            self.verdict("        uses: bawbel/integrations@v1 # pin-exempt: tests the public tag")
        )

    def test_placeholder_is_reported_not_failed(self):
        kind, _ = self.verdict("      - uses: bawbel/integrations/gate-lint@<release-commit-sha> # <release tag>")
        self.assertEqual(kind, "placeholder")

    def test_rev_needs_a_sha_too(self):
        self.assertEqual(self.verdict("    rev: v1")[0], "error")
        self.assertIsNone(self.verdict(f"    rev: {SHA_B}  # frozen: v1.1.0"))
        self.assertEqual(self.verdict("    rev: <release-commit-sha>  # frozen: <release tag>")[0], "placeholder")

    def test_commented_rev_line_is_checked(self):
        self.assertEqual(self.verdict("#       rev: v1")[0], "error")

    def test_unrelated_lines_are_ignored(self):
        for text in ("name: x", "      - run: echo uses", "Use `bawbel/integrations` and pin it.", ""):
            self.assertIsNone(self.verdict(text), text)


class TestOwnActionTag(unittest.TestCase):
    def test_sha_must_match_the_tag(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            sha = make_repo(root)
            ok = f"      - uses: bawbel/integrations@{sha} # v1.1.0"
            self.assertIsNone(check_pins.check_line(root, ok))

            wrong = f"      - uses: bawbel/integrations@{SHA_B} # v1.1.0"
            kind, message = check_pins.check_line(root, wrong)
            self.assertEqual(kind, "error")
            self.assertIn(sha, message)

    def test_tag_that_is_not_in_the_checkout_fails(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            make_repo(root)
            line = f"      - uses: bawbel/integrations@{SHA_B} # v9.9.9"
            kind, message = check_pins.check_line(root, line)
            self.assertEqual(kind, "error")
            self.assertIn("not in this checkout", message)

    def test_subpath_action_is_compared_with_the_tag_too(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            make_repo(root)
            line = f"      - uses: bawbel/integrations/gate-lint@{SHA_B} # v1.1.0"
            self.assertEqual(check_pins.check_line(root, line)[0], "error")

    def test_third_party_action_is_not_compared_with_a_local_tag(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            make_repo(root)
            self.assertIsNone(
                check_pins.check_line(root, f"      - uses: actions/checkout@{SHA_A} # v4.4.0")
            )


class TestRun(unittest.TestCase):
    def tree(self, files):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        root = Path(tmp.name)
        for name, body in files.items():
            path = root / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(body, encoding="utf-8")
        return root

    def test_reports_file_and_line(self):
        root = self.tree(
            {
                ".github/workflows/ci.yml": f"jobs:\n  a:\n    steps:\n      - uses: actions/checkout@{SHA_A} # v4.4.0\n",
                "README.md": "text\n```yaml\n      - uses: actions/checkout@v4\n```\n",
            }
        )
        errors, placeholders = check_pins.run(root)
        self.assertEqual(placeholders, [])
        self.assertEqual(len(errors), 1)
        self.assertTrue(errors[0].startswith("README.md:3:"), errors[0])

    def test_files_outside_the_list_are_not_read(self):
        root = self.tree({"docs/other.md": "      - uses: actions/checkout@v4\n"})
        self.assertEqual(check_pins.run(root), ([], []))

    def test_examples_are_read_recursively(self):
        root = self.tree({"examples/ci/deep.yml": "      - uses: actions/checkout@v4\n"})
        self.assertEqual(len(check_pins.run(root)[0]), 1)

    def test_main_exit_codes(self):
        bad = self.tree({"README.md": "      - uses: actions/checkout@v4\n"})
        good = self.tree({"README.md": f"      - uses: actions/checkout@{SHA_A} # v4.4.0\n"})
        self.assertEqual(check_pins.main(["--root", str(bad)]), 1)
        self.assertEqual(check_pins.main(["--root", str(good)]), 0)
        self.assertEqual(check_pins.main(["--root", str(good / "missing")]), 2)

    def test_placeholders_do_not_fail_the_run(self):
        root = self.tree({"README.md": "      - uses: bawbel/integrations/gate-lint@<release-commit-sha> # <release tag>\n"})
        errors, placeholders = check_pins.run(root)
        self.assertEqual((errors, len(placeholders)), ([], 1))
        self.assertEqual(check_pins.main(["--root", str(root)]), 0)


class TestThisRepository(unittest.TestCase):
    """The tree this test runs in. CI checks out with fetch-depth 0 so the tags are there."""

    def test_every_reference_is_pinned(self):
        errors, _ = check_pins.run(ROOT)
        self.assertEqual(errors, [])


if __name__ == "__main__":
    unittest.main()
