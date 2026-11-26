// resolveAveApiUrl and aveRecordUrl build the links the extension shows for AVE records.
// A bad setting must never produce a link to an unexpected scheme. Run with `npm test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { aveRecordUrl, resolveAveApiUrl } from "../src/core/urls";
import { DEFAULT_AVE_API_URL } from "../src/core/types";

test("a valid http(s) URL is kept, without a trailing slash", () => {
  assert.equal(resolveAveApiUrl("https://ave.example.test"), "https://ave.example.test");
  assert.equal(resolveAveApiUrl("https://ave.example.test/api/"), "https://ave.example.test/api");
  assert.equal(resolveAveApiUrl("http://localhost:8080"), "http://localhost:8080");
  assert.equal(resolveAveApiUrl("  https://ave.example.test/x  "), "https://ave.example.test/x");
});

test("query and fragment are dropped from the base", () => {
  assert.equal(resolveAveApiUrl("https://ave.example.test/api?token=1#frag"), "https://ave.example.test/api");
});

test("anything that is not an http(s) URL with a host gives the default", () => {
  const bad: unknown[] = [
    undefined,
    null,
    42,
    "",
    "not a url",
    "javascript:alert(1)",
    "file:///etc/passwd",
    "ftp://ave.example.test",
    "https://",
    '"><script>',
  ];
  for (const raw of bad) {
    assert.equal(resolveAveApiUrl(raw), DEFAULT_AVE_API_URL, `raw: ${String(raw)}`);
  }
});

test("a record URL is the base plus /records/ plus the percent-encoded id", () => {
  assert.equal(
    aveRecordUrl("https://api.aveproject.org", "AVE-2026-00001"),
    "https://api.aveproject.org/records/AVE-2026-00001",
  );
  assert.equal(
    aveRecordUrl("https://ave.example.test", "a/b?c#d"),
    "https://ave.example.test/records/a%2Fb%3Fc%23d",
  );
});
