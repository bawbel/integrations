/**
 * Tests for core/parser.ts — normaliseFinding and parseCliOutput
 *
 * Naming: parser_[behaviour]_when_[condition]
 */

import { describe, it, expect } from "vitest";
import { parseCliOutput, normaliseFinding } from "../../core/parser";

// ── normaliseFinding ──────────────────────────────────────────────────────────

describe("normaliseFinding", () => {
  it("maps required fields from CLI object", () => {
    const raw = {
      rule_id: "bawbel-shell-pipe", ave_id: "AVE-2026-00001",
      title: "Shell injection via pipe", description: "desc",
      severity: "HIGH", cvss_ai: 7.5, line: 10, engine: "pattern",
    };
    const f = normaliseFinding(raw);
    expect(f.rule_id).toBe("bawbel-shell-pipe");
    expect(f.ave_id).toBe("AVE-2026-00001");
    expect(f.severity).toBe("HIGH");
    expect(f.cvss_ai).toBe(7.5);
    expect(f.line).toBe(10);
  });

  it("maps owasp_mcp field", () => {
    const raw = {
      rule_id: "r", ave_id: "a", title: "t", description: "d",
      severity: "HIGH", cvss_ai: 7, line: 1, engine: "pattern",
      owasp_mcp: ["A09:2021"],
    };
    const f = normaliseFinding(raw);
    expect(f.owasp_mcp).toEqual(["A09:2021"]);
  });

  it("maps aivss_score field", () => {
    const raw = {
      rule_id: "r", ave_id: "a", title: "t", description: "d",
      severity: "CRITICAL", cvss_ai: 9, line: 5, engine: "pattern",
      aivss_score: 8.4,
    };
    const f = normaliseFinding(raw);
    expect(f.aivss_score).toBe(8.4);
  });

  it("maps evidence_stage field", () => {
    const raw = {
      rule_id: "r", ave_id: "a", title: "t", description: "d",
      severity: "HIGH", cvss_ai: 7, line: 1, engine: "pattern",
      evidence_stage: "confirmed",
    };
    const f = normaliseFinding(raw);
    expect(f.evidence_stage).toBe("confirmed");
  });

  it("maps confidence field", () => {
    const raw = {
      rule_id: "r", ave_id: "a", title: "t", description: "d",
      severity: "MEDIUM", cvss_ai: 5, line: 3, engine: "yara",
      confidence: 0.85,
    };
    const f = normaliseFinding(raw);
    expect(f.confidence).toBe(0.85);
  });

  it("maps piranha_url field", () => {
    const raw = {
      rule_id: "r", ave_id: "a", title: "t", description: "d",
      severity: "HIGH", cvss_ai: 7, line: 1, engine: "pattern",
      piranha_url: "https://api.piranha.bawbel.io/records/AVE-2026-00001",
    };
    const f = normaliseFinding(raw);
    expect(f.piranha_url).toBe("https://api.piranha.bawbel.io/records/AVE-2026-00001");
  });

  it("maps derived field", () => {
    const raw = {
      rule_id: "r", ave_id: "a", title: "t", description: "d",
      severity: "HIGH", cvss_ai: 7, line: 1, engine: "pattern",
      derived: true,
    };
    const f = normaliseFinding(raw);
    expect(f.derived).toBe(true);
  });

  it("applies safe defaults for missing optional fields", () => {
    const raw = {
      rule_id: "r", ave_id: "a", title: "t", description: "d",
      severity: "LOW", cvss_ai: 2, line: 1, engine: "pattern",
    };
    const f = normaliseFinding(raw);
    expect(f.owasp_mcp).toBeUndefined();
    expect(f.aivss_score).toBeUndefined();
    expect(f.evidence_stage).toBeUndefined();
    expect(f.confidence).toBeUndefined();
    expect(f.piranha_url).toBeUndefined();
    expect(f.derived).toBeUndefined();
    expect(f.col).toBeUndefined();
    expect(f.match).toBeUndefined();
  });

  it("maps both owasp and owasp_mcp as separate fields", () => {
    // owasp = OWASP AI Security categories; owasp_mcp = MCP threat categories
    const raw = {
      rule_id: "r", ave_id: "a", title: "t", description: "d",
      severity: "HIGH", cvss_ai: 7, line: 1, engine: "pattern",
      owasp: ["ASI01", "ASI08"], owasp_mcp: ["MCP03", "MCP10"],
    };
    const f = normaliseFinding(raw);
    expect(f.owasp).toEqual(["ASI01", "ASI08"]);
    expect(f.owasp_mcp).toEqual(["MCP03", "MCP10"]);
  });

  it("handles null line (file-level finding)", () => {
    const raw = {
      rule_id: "r", ave_id: "a", title: "t", description: "d",
      severity: "HIGH", cvss_ai: 7, line: null, engine: "yara",
    };
    const f = normaliseFinding(raw);
    expect(f.line).toBeNull();
  });
});

// ── parseCliOutput with normaliseFinding ──────────────────────────────────────

describe("parseCliOutput", () => {
  it("normalises findings inside file results", () => {
    const output = JSON.stringify([{
      file_path: "skill.md", component_type: "skill",
      risk_score: 7, max_severity: "HIGH", scan_time_ms: 42,
      has_error: false,
      findings: [{
        rule_id: "bawbel-shell-pipe", ave_id: "AVE-2026-00001",
        title: "Shell pipe", description: "desc",
        severity: "HIGH", cvss_ai: 7, line: 5, engine: "pattern",
        owasp_mcp: ["A09:2021"], aivss_score: 7.2,
      }],
    }]);
    const { results, error } = parseCliOutput(output, "skill.md");
    expect(error).toBeNull();
    expect(results[0].findings[0].owasp_mcp).toEqual(["A09:2021"]);
    expect(results[0].findings[0].aivss_score).toBe(7.2);
  });
});
