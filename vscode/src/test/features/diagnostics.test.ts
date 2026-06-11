/**
 * Tests for features/diagnostics.ts — toVsSeverity
 *
 * toVsSeverity is a pure function (two numbers in, one enum out).
 * Tests run without a VS Code host — the vscode mock supplies DiagnosticSeverity.
 *
 * Naming: toVsSeverity_[behaviour]_when_[condition]
 */

import { describe, it, expect } from "vitest";
import { DiagnosticSeverity } from "vscode";

// Import the function under test — will fail until it is exported
import { toVsSeverity } from "../../features/diagnostics";
import { SEVERITY_INDEX } from "../../core/types";

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
