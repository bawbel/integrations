/**
 * Tests for core/cli.ts — CANDIDATE_PATHS
 *
 * Naming: cli_[behaviour]_when_[condition]
 */

import { describe, it, expect } from "vitest";
import { CANDIDATE_PATHS } from "../../core/cli";

describe("CANDIDATE_PATHS", () => {
  it("includes the correct pipx venv path for bawbel-scanner", () => {
    // pipx installs to ~/.local/pipx/venvs/<package>/bin/<binary>
    // not ~/.local/pipx/<package>/bin/<binary>
    const home = process.env.HOME ?? "";
    const correct = `${home}/.local/pipx/venvs/bawbel-scanner/bin/bawbel`;
    expect(CANDIDATE_PATHS).toContain(correct);
  });

  it("does not contain the wrong pipx path (missing venvs/ segment)", () => {
    const home = process.env.HOME ?? "";
    const wrong = `${home}/.local/pipx/bawbel/bin/bawbel`;
    expect(CANDIDATE_PATHS).not.toContain(wrong);
  });

  it("includes plain 'bawbel' for PATH resolution", () => {
    expect(CANDIDATE_PATHS).toContain("bawbel");
  });

  it("includes the ~/.local/bin path for pip --user installs", () => {
    const home = process.env.HOME ?? "";
    expect(CANDIDATE_PATHS).toContain(`${home}/.local/bin/bawbel`);
  });
});
