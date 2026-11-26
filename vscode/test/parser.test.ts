// parseCliOutput turns `bawbel scan --format json` stdout into results and never throws.
// Pure module: no VS Code host needed. Run with `npm test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCliOutput } from "../src/core/parser";

const FILE_RESULT = {
  file_path: "skills/a.md",
  component_type: "skill",
  risk_score: 8.8,
  max_severity: "HIGH",
  scan_time_ms: 12,
  has_error: false,
  findings: [
    {
      rule_id: "bawbel-shell-pipe",
      ave_id: "AVE-2026-00004",
      title: "Shell pipe",
      description: "pipes a shell command",
      severity: "HIGH",
      line: 3,
      engine: "pattern",
    },
  ],
};

test("a top-level array of file results is parsed as is", () => {
  const { results, error } = parseCliOutput(JSON.stringify([FILE_RESULT]), "fallback.md");
  assert.equal(error, null);
  assert.equal(results.length, 1);
  assert.equal(results[0].file_path, "skills/a.md");
  assert.equal(results[0].findings[0].ave_id, "AVE-2026-00004");
  assert.equal(results[0].max_severity, "HIGH");
});

test("text before the JSON, such as a version header, is skipped", () => {
  const stdout = `Bawbel Scanner v1.3.0\n${JSON.stringify([FILE_RESULT])}\n`;
  const { results, error } = parseCliOutput(stdout, "fallback.md");
  assert.equal(error, null);
  assert.equal(results.length, 1);
});

test("a single object and a { results: [...] } wrapper are both accepted", () => {
  assert.equal(parseCliOutput(JSON.stringify(FILE_RESULT), "f.md").results.length, 1);
  assert.equal(parseCliOutput(JSON.stringify({ results: [FILE_RESULT] }), "f.md").results.length, 1);
});

test("a bare array of findings (old CLI) is attributed to the fallback path", () => {
  const { results, error } = parseCliOutput(JSON.stringify(FILE_RESULT.findings), "fallback.md");
  assert.equal(error, null);
  assert.equal(results.length, 1);
  assert.equal(results[0].file_path, "fallback.md");
  assert.equal(results[0].findings.length, 1);
});

test("missing fields get defaults and a missing findings array becomes empty", () => {
  const { results } = parseCliOutput(JSON.stringify([{ file_path: "x.md" }]), "fallback.md");
  assert.equal(results[0].risk_score, 0);
  assert.equal(results[0].max_severity, "LOW");
  assert.equal(results[0].has_error, false);
  assert.deepEqual(results[0].findings, []);
  assert.equal(results[0].error, undefined);
});

test("empty output is no results and no error", () => {
  assert.deepEqual(parseCliOutput("   \n", "f.md"), { results: [], error: null });
});

test("output with no JSON, and malformed JSON, give an error and no results, never a throw", () => {
  const noJson = parseCliOutput("scanner crashed", "f.md");
  assert.deepEqual(noJson.results, []);
  assert.match(noJson.error ?? "", /No JSON found/);

  const bad = parseCliOutput('[{"file_path": ', "f.md");
  assert.deepEqual(bad.results, []);
  assert.match(bad.error ?? "", /JSON parse failed/);
});
