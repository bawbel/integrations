/**
 * Tests for features/diagnostics.ts — toVsSeverity, DiagnosticsManager
 *
 * toVsSeverity is a pure function (two numbers in, one enum out).
 * DiagnosticsManager tests verify I/O is not repeated per file.
 * Tests run without a VS Code host — the vscode mock supplies DiagnosticSeverity.
 *
 * Naming: toVsSeverity_[behaviour]_when_[condition]
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { DiagnosticSeverity, languages } from "vscode";
import * as suppressionsModule from "../../core/suppressions";

import { toVsSeverity, DiagnosticsManager } from "../../features/diagnostics";
import { SEVERITY_INDEX, BawbelFileResult } from "../../core/types";

const HIGH_IDX     = SEVERITY_INDEX["HIGH"];
const CRITICAL_IDX = SEVERITY_INDEX["CRITICAL"];
const MEDIUM_IDX   = SEVERITY_INDEX["MEDIUM"];
const LOW_IDX      = SEVERITY_INDEX["LOW"];

describe("toVsSeverity", () => {
  it("maps CRITICAL to Error when threshold is HIGH", () => {
    expect(toVsSeverity("CRITICAL", HIGH_IDX)).toBe(DiagnosticSeverity.Error);
  });

  it("maps HIGH to Error when threshold is HIGH", () => {
    expect(toVsSeverity("HIGH", HIGH_IDX)).toBe(DiagnosticSeverity.Error);
  });

  it("maps MEDIUM to Warning when threshold is HIGH", () => {
    expect(toVsSeverity("MEDIUM", HIGH_IDX)).toBe(DiagnosticSeverity.Warning);
  });

  it("maps LOW to Warning when threshold is HIGH", () => {
    expect(toVsSeverity("LOW", HIGH_IDX)).toBe(DiagnosticSeverity.Warning);
  });

  it("maps MEDIUM to Error when threshold is MEDIUM", () => {
    expect(toVsSeverity("MEDIUM", MEDIUM_IDX)).toBe(DiagnosticSeverity.Error);
  });

  it("maps LOW to Warning when threshold is MEDIUM", () => {
    expect(toVsSeverity("LOW", MEDIUM_IDX)).toBe(DiagnosticSeverity.Warning);
  });

  it("maps CRITICAL to Error when threshold is CRITICAL", () => {
    expect(toVsSeverity("CRITICAL", CRITICAL_IDX)).toBe(DiagnosticSeverity.Error);
  });

  it("maps HIGH to Warning when threshold is CRITICAL", () => {
    expect(toVsSeverity("HIGH", CRITICAL_IDX)).toBe(DiagnosticSeverity.Warning);
  });

  it("maps LOW to Error when threshold is LOW", () => {
    expect(toVsSeverity("LOW", LOW_IDX)).toBe(DiagnosticSeverity.Error);
  });

  it("maps unknown severity to Warning (safe default)", () => {
    expect(toVsSeverity("UNKNOWN" as any, HIGH_IDX)).toBe(DiagnosticSeverity.Warning);
  });
});

// ── DiagnosticsManager — suppression I/O ─────────────────────────────────────

function makeResult(filePath: string): BawbelFileResult {
  return {
    file_path: filePath, component_type: "skill",
    risk_score: 0, max_severity: "LOW", scan_time_ms: 1,
    has_error: false, findings: [],
  };
}

describe("DiagnosticsManager.applyResults", () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it("loads suppressions once for N files", () => {
    vi.spyOn(suppressionsModule, "loadSuppressions").mockReturnValue([]);
    vi.spyOn(suppressionsModule, "filterInlineIgnored").mockImplementation((_, f) => f);

    const manager = new DiagnosticsManager(languages.createDiagnosticCollection());
    manager.applyResults([makeResult("a.md"), makeResult("b.md"), makeResult("c.md")]);

    expect(suppressionsModule.loadSuppressions).toHaveBeenCalledTimes(1);
  });

  it("loads suppressions once for N files on reRenderAll", () => {
    vi.spyOn(suppressionsModule, "loadSuppressions").mockReturnValue([]);
    vi.spyOn(suppressionsModule, "filterInlineIgnored").mockImplementation((_, f) => f);

    const manager = new DiagnosticsManager(languages.createDiagnosticCollection());
    // Prime the cache with 3 files
    manager.applyResults([makeResult("a.md"), makeResult("b.md"), makeResult("c.md")]);
    vi.clearAllMocks();
    vi.spyOn(suppressionsModule, "loadSuppressions").mockReturnValue([]);

    manager.reRenderAll();
    expect(suppressionsModule.loadSuppressions).toHaveBeenCalledTimes(1);
  });
});
