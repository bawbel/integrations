#!/usr/bin/env python3
"""
bawbel-pre-commit — pre-commit hook entry point for Bawbel Scanner.

Called by pre-commit with a list of staged file paths as arguments.
Scans each file via the bawbel CLI and exits non-zero if any findings
meet or exceed the configured severity threshold.

Exit codes:
    0  — all files clean (or only suppressed findings, or bawbel not installed)
    1  — one or more findings at or above --fail-on-severity
    2  — scan error (invalid JSON output, engine crash, etc.)
"""

import argparse
import json
import subprocess  # nosec B404 — subprocess used intentionally, list form only
import sys
from pathlib import Path

# Severity ordering — higher index = more severe
SEVERITY_ORDER: dict[str, int] = {
    "CRITICAL": 4,
    "HIGH":     3,
    "MEDIUM":   2,
    "LOW":      1,
}


# What: invokes bawbel scan on a single file and returns parsed findings
# Why:  wraps CLI call so the hook never imports scanner internals (CLAUDE.md rule 5)
# How:  subprocess list form → captures JSON stdout → returns (findings, error);
#       FileNotFoundError signals bawbel is not installed (GracefulDegradation)
#
# Sec:  INPUT  — path is a validated Path object, not raw user string
#       OUTPUT — JSON parsed to list[dict]; never eval'd or exec'd
#       TRUST  — CLI stdout treated as untrusted; parsed with json.loads only
#       ERROR  — FileNotFoundError returns sentinel "not_installed"; all other
#                exceptions return ([], error_str); never raises
def _scan_file(path: Path, no_ignore: bool) -> tuple[list[dict], str | None]:
    args = ["bawbel", "scan", str(path), "--format", "json"]
    if no_ignore:
        args.append("--no-ignore")

    try:
        result = subprocess.run(  # nosec B603 — list form used, shell=True absent,
                                  # path is a validated Path object
            args,
            capture_output=True,
            text=True,
            timeout=60,
        )
        data = json.loads(result.stdout)
        if isinstance(data, list) and data:
            return data[0].get("findings", []), None
        return [], None
    except FileNotFoundError:
        return [], "not_installed"
    except Exception as exc:  # nosec B110 — logged below as scan error
        return [], str(exc)


# What: checks whether a finding severity meets or exceeds the failure threshold
# Why:  determines which findings block commits; CRITICAL > HIGH > MEDIUM > LOW
# How:  looks up both values in SEVERITY_ORDER; unknown severities default to 0
def _meets_threshold(severity: str, threshold: str) -> bool:
    return (
        SEVERITY_ORDER.get(severity.upper(), 0)
        >= SEVERITY_ORDER.get(threshold.upper(), 0)
    )


# What: scans staged files and returns the appropriate exit code
# Why:  extracted from main() so it can be tested without argparse/sys.argv
# How:  calls _scan_file once per file, caches results, checks threshold;
#       files in `found` reuse cached results — never scanned twice
def run(
    filenames: list[str],
    fail_on_severity: str = "high",
    no_ignore: bool = False,
) -> int:
    if not filenames:
        return 0

    found: list[str] = []
    errors: list[str] = []
    cached: dict[str, list[dict]] = {}

    for filename in filenames:
        path = Path(filename)
        if not path.exists():
            continue

        findings, error = _scan_file(path, no_ignore)

        if error == "not_installed":
            print(
                "bawbel-scanner not installed.\n"
                'Run: pip install "bawbel-scanner>=1.2.3"',
                file=sys.stderr,
            )
            return 0

        if error:
            errors.append(f"  {filename}: {error}")
            continue

        cached[filename] = findings

        for f in findings:
            if _meets_threshold(f.get("severity", ""), fail_on_severity):
                found.append(filename)
                break

    if found or errors:
        print("Bawbel Scanner")
        print("─" * 50)

    if errors:
        print("Scan errors:")
        for e in errors:
            print(e)

    if found:
        print(f"AVE vulnerabilities found ({fail_on_severity.upper()}+):")
        for filename in found:
            for f in cached.get(filename, []):
                sev = f.get("severity", "")
                if _meets_threshold(sev, fail_on_severity):
                    line_str = f"  line {f['line']}" if f.get("line") else ""
                    ave = f.get("ave_id") or f.get("rule_id", "")
                    print(f"  [{sev}] {ave}  {filename}{line_str}")
        print()
        print(
            f"Run 'bawbel report <file>' for remediation steps.\n"
            f"Add '<!-- bawbel-ignore: rule_id -->' to suppress false positives.\n"
            f"See: https://bawbel.io/docs/suppression"
        )

    if found:
        return 1
    if errors:
        return 2
    return 0


# What: CLI entry point — parses args from pre-commit and delegates to run()
# Why:  pre-commit framework calls this as a script with staged files as argv
# How:  argparse → run(); sys.exit with the return code
def main() -> int:
    parser = argparse.ArgumentParser(
        description="Bawbel Scanner pre-commit hook"
    )
    parser.add_argument(
        "filenames",
        nargs="*",
        help="Staged files to scan (passed by pre-commit)",
    )
    parser.add_argument(
        "--fail-on-severity",
        default="high",
        choices=["critical", "high", "medium", "low"],
        help="Minimum severity that causes a non-zero exit (default: high)",
    )
    parser.add_argument(
        "--no-ignore",
        action="store_true",
        default=False,
        help="Ignore all bawbel-ignore suppressions — audit mode",
    )
    args = parser.parse_args()
    return run(args.filenames, args.fail_on_severity, args.no_ignore)


if __name__ == "__main__":
    sys.exit(main())
