import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
test("source provenance accepts scoped task refs without relaxing publication tags", async () => {
  const directory = await mkdtemp(join(tmpdir(), "source-ref-manifest-"));
  const output = join(directory, "release.json");
  const commit = "1".repeat(40);
  const run = branch => spawnSync(process.execPath, [join(root, "scripts/write-release-manifest.mjs")], {
    cwd: root, encoding: "utf8", env: { ...process.env, YOUEYE_RELEASE_OUTPUT: output,
      YOUEYE_SOURCE_COMMIT: commit, YOUEYE_SOURCE_BRANCH: branch },
  });
  try {
    for (const branch of ["main", "dev", "detached", "agent/developer/task_123"]) {
      assert.equal(run(branch).status, 0, branch);
      const manifest = JSON.parse(await readFile(output, "utf8"));
      assert.equal(manifest.branch, branch);
      assert.equal(manifest.commit, commit);
      assert.equal(manifest.metadata_scope, "product-local");
    }
    for (const branch of ["/main", "main/", "agent//task", "agent/../main", "main.lock", "agent/main.lock/task", "agent/.hidden/task", "main.", "main\nbeta", "HEAD@{1}"]) {
      const result = run(branch);
      assert.notEqual(result.status, 0, branch);
      assert.match(result.stderr, /invalid source branch/);
    }
  } finally { await rm(directory, { recursive: true, force: true }); }
});
