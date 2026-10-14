import test from "node:test";
import assert from "node:assert/strict";
import { isReleaseVersion } from "../scripts/release-version.mjs";
import { expectedTag } from "../scripts/prepare-release.mjs";
test("canonical releases retain independent identity and exact branch", () => {
  for (const version of ["1.0.0", "0.5.4-dev.10", "0.5.4-worker-a42.2"]) assert.equal(isReleaseVersion(version), true);
  assert.equal(expectedTag("agent/Sebastian/a42", "0.5.4-worker-a42.2"), "agent/Sebastian/a42-v0.5.4-worker-a42.2");
  assert.equal(expectedTag("main", "1.0.0"), "v1.0.0");
});
test("canonical producer grammar rejects ambiguous identities", () => {
  for (const version of ["1.0", "1.0.0.0", "01.0.0", "1.0.0-Dev.1", "1.0.0-dev.0", "1.0.0-dev.01", "1.0.0-dev.9007199254740992", "1.0.0-dev.1+bytes"]) assert.equal(isReleaseVersion(version), false, version);
  for (const branch of ["", "a..b", "a/b.lock", "a@{b", "-dev"]) assert.throws(() => expectedTag(branch, "1.0.0-dev.1"));
});
