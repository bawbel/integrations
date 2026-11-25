// getRemediation returns the inline "how to fix" hint for a rule, or the finding's own
// description when the rule has no hint. Run with `npm test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { getRemediation, hasSpecificRemediation } from "../src/core/remediation";

test("a rule with a hint returns the hint, not the description", () => {
  assert.equal(hasSpecificRemediation("bawbel-shell-pipe"), true);
  const hint = getRemediation("bawbel-shell-pipe", "the finding description");
  assert.notEqual(hint, "the finding description");
  assert.match(hint, /curl\|bash/);
});

test("a rule with no hint falls back to the finding description", () => {
  assert.equal(hasSpecificRemediation("no-such-rule"), false);
  assert.equal(getRemediation("no-such-rule", "the finding description"), "the finding description");
});

test("every hint is a non-empty string", () => {
  for (const id of ["bawbel-shell-pipe", "bawbel-external-fetch"]) {
    const hint = getRemediation(id, "");
    assert.equal(typeof hint, "string");
    assert.ok(hint.length > 0, id);
  }
});
