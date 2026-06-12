"""
Tests for the SARIF fallback logic used in action.yml's "Run Bawbel scan" step.

The scan step writes bawbel stdout to a .sarif file, then validates it.
If the file is empty or not valid JSON, it must write a minimal valid SARIF
so that upload-sarif never receives invalid input.
"""

import json
import os
import tempfile
import pytest


# ── Helper: the validation + fallback logic extracted from action.yml ─────────
# This mirrors the bash logic so we can test it in Python without running bash.

MINIMAL_SARIF = {
    "version": "2.1.0",
    "$schema": (
        "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/"
        "Schemata/sarif-schema-2.1.0.json"
    ),
    "runs": [],
}


def ensure_valid_sarif(sarif_path: str) -> bool:
    """
    What: validates sarif_path contains parseable JSON; writes MINIMAL_SARIF if not
    Why:  upload-sarif fails with 'Unexpected end of JSON input' on empty/broken files
    How:  json.load() attempt; on any exception, overwrites with MINIMAL_SARIF;
          returns True if original was valid, False if fallback was written
    """
    try:
        with open(sarif_path) as f:
            json.load(f)
        return True
    except Exception:
        with open(sarif_path, "w") as f:
            json.dump(MINIMAL_SARIF, f)
            f.write("\n")
        return False


# ── Tests ─────────────────────────────────────────────────────────────────────

def test_sarif_fallback_when_file_is_empty():
    with tempfile.NamedTemporaryFile(mode="w", suffix=".sarif", delete=False) as f:
        f.write("")  # empty — what bawbel produces when it crashes
        path = f.name
    try:
        result = ensure_valid_sarif(path)
        assert result is False
        with open(path) as f:
            data = json.load(f)
        assert data["version"] == "2.1.0"
        assert data["runs"] == []
    finally:
        os.unlink(path)


def test_sarif_fallback_when_file_is_truncated_json():
    with tempfile.NamedTemporaryFile(mode="w", suffix=".sarif", delete=False) as f:
        f.write('{"version": "2.1.0", "runs": [')  # truncated mid-array
        path = f.name
    try:
        result = ensure_valid_sarif(path)
        assert result is False
        with open(path) as f:
            data = json.load(f)
        assert data["version"] == "2.1.0"
    finally:
        os.unlink(path)


def test_sarif_no_fallback_when_file_is_valid():
    valid = {"version": "2.1.0", "runs": [{"tool": {"driver": {"name": "bawbel"}}}]}
    with tempfile.NamedTemporaryFile(mode="w", suffix=".sarif", delete=False) as f:
        json.dump(valid, f)
        path = f.name
    try:
        result = ensure_valid_sarif(path)
        assert result is True
        with open(path) as f:
            data = json.load(f)
        assert data["runs"][0]["tool"]["driver"]["name"] == "bawbel"
    finally:
        os.unlink(path)


def test_sarif_fallback_produces_valid_json():
    with tempfile.NamedTemporaryFile(mode="w", suffix=".sarif", delete=False) as f:
        f.write("not json at all")
        path = f.name
    try:
        ensure_valid_sarif(path)
        with open(path) as f:
            content = f.read()
        data = json.loads(content)
        assert "$schema" in data
        assert "version" in data
        assert "runs" in data
    finally:
        os.unlink(path)


def test_sarif_fallback_when_file_is_plain_text_error():
    # bawbel writes an error message to stdout when misconfigured
    with tempfile.NamedTemporaryFile(mode="w", suffix=".sarif", delete=False) as f:
        f.write("Error: bawbel-scanner requires Python 3.10+\n")
        path = f.name
    try:
        result = ensure_valid_sarif(path)
        assert result is False
        with open(path) as f:
            data = json.load(f)
        assert data["version"] == "2.1.0"
    finally:
        os.unlink(path)
