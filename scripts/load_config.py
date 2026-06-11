#!/usr/bin/env python3
"""
load_config.py — resolves bawbel scan configuration for the GitHub Action.

Called by the "Load bawbel.yml config" step in action.yml.
Reads bawbel.yml exactly once, applies ConfigPriority, and prints
resolved key=value pairs to stdout for the shell to pipe to $GITHUB_OUTPUT.

Exit codes:
    0  — resolved config printed successfully
    1  — programming error (wrong arguments)
"""

import argparse
import os
import sys

# Action input defaults — must match the defaults declared in action.yml
DEFAULTS: dict[str, str] = {
    "recursive":        "true",
    "fail_on_severity": "high",
    "format":           "sarif",
    "no_ignore":        "false",
}


# What: reads the scan section from bawbel.yml and returns field values as strings
# Why:  single parse point — bawbel.yml is opened exactly once per action run
# How:  yaml.safe_load → scan dict → extract known fields; booleans normalised
#       to "true"/"false"; missing/empty fields excluded from result dict
#
# Sec:  INPUT  — path is a value from github.workspace, validated by os.path.isfile
#       OUTPUT — plain strings; never eval'd or exec'd
#       TRUST  — file content treated as untrusted YAML; safe_load only, no full_load
#       ERROR  — any parse or IO failure returns {} (fail open, use defaults)
def load_bawbel_yml(path: str) -> dict[str, str]:
    if not os.path.isfile(path):
        return {}

    try:
        import yaml  # type: ignore[import]
    except ImportError:
        return {}

    try:
        with open(path, encoding="utf-8", errors="replace") as fh:
            data = yaml.safe_load(fh)
    except Exception:
        return {}

    if not isinstance(data, dict):
        return {}

    scan = data.get("scan", {})
    if not isinstance(scan, dict):
        return {}

    result: dict[str, str] = {}
    for key in ("recursive", "fail_on_severity", "format", "no_ignore"):
        val = scan.get(key)
        if val is None or val == "":
            continue
        if isinstance(val, bool):
            result[key] = "true" if val else "false"
        else:
            result[key] = str(val)

    return result


# What: applies ConfigPriority to produce the final resolved config
# Why:  bawbel.yml values override action defaults but not explicit user inputs
# How:  for each field, use the yml value only when the input is still at its
#       default — if the user set it explicitly, their value always wins
def resolve_config(inputs: dict[str, str], yml: dict[str, str]) -> dict[str, str]:
    resolved: dict[str, str] = {}
    for key, default in DEFAULTS.items():
        input_val = inputs.get(key, default)
        yml_val   = yml.get(key, "")
        if yml_val and input_val == default:
            resolved[key] = yml_val
        else:
            resolved[key] = input_val
    return resolved


# What: CLI entry point — reads inputs from argv, resolves config, prints key=value lines
# Why:  action.yml calls this script and pipes stdout to $GITHUB_OUTPUT
# How:  argparse → load_bawbel_yml → resolve_config → print;
#       output keys use dashes (fail-on-severity, no-ignore) to match action output names
def main() -> None:
    parser = argparse.ArgumentParser(
        description="Resolve bawbel scan config from bawbel.yml and action inputs"
    )
    parser.add_argument("--config",           default="bawbel.yml")
    parser.add_argument("--recursive",        default=DEFAULTS["recursive"])
    parser.add_argument("--fail-on-severity", default=DEFAULTS["fail_on_severity"],
                        dest="fail_on_severity")
    parser.add_argument("--format",           default=DEFAULTS["format"])
    parser.add_argument("--no-ignore",        default=DEFAULTS["no_ignore"],
                        dest="no_ignore")
    args = parser.parse_args()

    inputs = {
        "recursive":        args.recursive,
        "fail_on_severity": args.fail_on_severity,
        "format":           args.format,
        "no_ignore":        args.no_ignore,
    }

    yml      = load_bawbel_yml(args.config)
    resolved = resolve_config(inputs, yml)

    # Print with the dash-style keys that action.yml step outputs expect
    print(f"recursive={resolved['recursive']}")
    print(f"fail-on-severity={resolved['fail_on_severity']}")
    print(f"format={resolved['format']}")
    print(f"no-ignore={resolved['no_ignore']}")


if __name__ == "__main__":
    main()
