"""
Tests for scripts/load_config.py

Tests exercise load_bawbel_yml() and resolve_config() directly.
No subprocess calls — tests run without a GitHub Actions environment.

Naming: test_load_config_[behaviour]_when_[condition]
"""

import textwrap
from pathlib import Path
from unittest.mock import mock_open, patch

import pytest

# Import the module under test — will fail until scripts/load_config.py exists
from scripts.load_config import load_bawbel_yml, resolve_config, DEFAULTS


# ── load_bawbel_yml ───────────────────────────────────────────────────────────

def test_load_config_returns_empty_dict_when_file_missing(tmp_path):
    result = load_bawbel_yml(str(tmp_path / "nonexistent.yml"))
    assert result == {}


def test_load_config_returns_empty_dict_when_yml_has_no_scan_section(tmp_path):
    f = tmp_path / "bawbel.yml"
    f.write_text("notify:\n  slack: true\n")
    assert load_bawbel_yml(str(f)) == {}


def test_load_config_reads_fail_on_severity(tmp_path):
    f = tmp_path / "bawbel.yml"
    f.write_text("scan:\n  fail_on_severity: critical\n")
    result = load_bawbel_yml(str(f))
    assert result["fail_on_severity"] == "critical"


def test_load_config_reads_recursive_bool_true(tmp_path):
    f = tmp_path / "bawbel.yml"
    f.write_text("scan:\n  recursive: false\n")
    result = load_bawbel_yml(str(f))
    assert result["recursive"] == "false"


def test_load_config_reads_format(tmp_path):
    f = tmp_path / "bawbel.yml"
    f.write_text("scan:\n  format: json\n")
    result = load_bawbel_yml(str(f))
    assert result["format"] == "json"


def test_load_config_reads_no_ignore_bool(tmp_path):
    f = tmp_path / "bawbel.yml"
    f.write_text("scan:\n  no_ignore: true\n")
    result = load_bawbel_yml(str(f))
    assert result["no_ignore"] == "true"


def test_load_config_reads_all_fields_in_one_parse(tmp_path):
    # What: confirms all four fields are extracted in one call
    # Why:  the whole point of this refactor — bawbel.yml opened once
    f = tmp_path / "bawbel.yml"
    f.write_text(textwrap.dedent("""\
        scan:
          recursive: false
          fail_on_severity: critical
          format: json
          no_ignore: true
    """))
    result = load_bawbel_yml(str(f))
    assert result == {
        "recursive":        "false",
        "fail_on_severity": "critical",
        "format":           "json",
        "no_ignore":        "true",
    }


def test_load_config_returns_empty_dict_on_malformed_yaml(tmp_path):
    f = tmp_path / "bawbel.yml"
    f.write_text("scan: [\nbroken yaml")
    assert load_bawbel_yml(str(f)) == {}


def test_load_config_ignores_fields_not_set_in_yml(tmp_path):
    f = tmp_path / "bawbel.yml"
    f.write_text("scan:\n  fail_on_severity: medium\n")
    result = load_bawbel_yml(str(f))
    assert "recursive" not in result
    assert "format" not in result
    assert "no_ignore" not in result


# ── resolve_config ────────────────────────────────────────────────────────────

def test_resolve_config_uses_defaults_when_yml_empty():
    resolved = resolve_config(DEFAULTS.copy(), {})
    assert resolved == DEFAULTS


def test_resolve_config_yml_overrides_default():
    inputs = DEFAULTS.copy()
    yml    = {"fail_on_severity": "critical"}
    result = resolve_config(inputs, yml)
    assert result["fail_on_severity"] == "critical"


def test_resolve_config_explicit_input_wins_over_yml():
    # ConfigPriority: explicit ActionInput > bawbel.yml
    inputs = {**DEFAULTS, "fail_on_severity": "medium"}  # user set it explicitly
    yml    = {"fail_on_severity": "critical"}
    result = resolve_config(inputs, yml)
    assert result["fail_on_severity"] == "medium"


def test_resolve_config_yml_overrides_recursive_default():
    inputs = DEFAULTS.copy()
    yml    = {"recursive": "false"}
    result = resolve_config(inputs, yml)
    assert result["recursive"] == "false"


def test_resolve_config_explicit_recursive_wins_over_yml():
    inputs = {**DEFAULTS, "recursive": "false"}
    yml    = {"recursive": "true"}
    result = resolve_config(inputs, yml)
    assert result["recursive"] == "false"


def test_resolve_config_yml_overrides_format_default():
    inputs = DEFAULTS.copy()
    yml    = {"format": "json"}
    result = resolve_config(inputs, yml)
    assert result["format"] == "json"


def test_resolve_config_yml_overrides_no_ignore_default():
    inputs = DEFAULTS.copy()
    yml    = {"no_ignore": "true"}
    result = resolve_config(inputs, yml)
    assert result["no_ignore"] == "true"


def test_resolve_config_returns_all_four_keys():
    result = resolve_config(DEFAULTS.copy(), {})
    assert set(result.keys()) == {"recursive", "fail_on_severity", "format", "no_ignore"}


# ── CLI output format ─────────────────────────────────────────────────────────

def test_load_config_cli_outputs_github_output_keys(tmp_path, capsys):
    # What: verifies CLI prints keys that match GITHUB_OUTPUT expectations
    # Why:  action.yml pipes the output directly to $GITHUB_OUTPUT
    f = tmp_path / "bawbel.yml"
    f.write_text("scan:\n  fail_on_severity: critical\n")
    import sys
    from scripts.load_config import main
    sys.argv = [
        "load_config.py",
        "--config", str(f),
        "--recursive", "true",
        "--fail-on-severity", "high",
        "--format", "sarif",
        "--no-ignore", "false",
    ]
    main()
    out = capsys.readouterr().out
    assert "recursive=" in out
    assert "fail-on-severity=critical" in out
    assert "format=" in out
    assert "no-ignore=" in out
