import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { assertSourceConsistency, expectedTag, inspectRelease, updateSourceVersions } from "../scripts/prepare-release.mjs";

const root = resolve(new URL("..", import.meta.url).pathname);
const manifest = JSON.parse(await readFile(resolve(root, ".youeye/build/manifest.json"), "utf8"));
const entrypoint = await readFile(resolve(root, ".youeye/build/app"), "utf8");
const helper = await readFile(resolve(root, ".youeye/build/lib.sh"), "utf8");
const yaml = await readFile(resolve(root, "youeye-app.yaml"), "utf8");
const pkg = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
const cli = (...args) => spawnSync(process.execPath, [resolve(root, "scripts/prepare-release.mjs"), ...args], { encoding: "utf8", env: { ...process.env, YOUEYE_RELEASE_ROOT: root } });

async function temporarySource(version = "1.2.3", manifestVersion = version) {
  const temporary = await mkdtemp(join(tmpdir(), "youeye-release-contract-"));
  await writeFile(join(temporary, "package.json"), JSON.stringify({ version }) + "\n");
  await writeFile(join(temporary, "youeye-app.yaml"), `apiVersion: v1\nversion: ${manifestVersion}\n`);
  return temporary;
}

test("source-owned build contract uses the supported unsigned standalone profile", () => {
  assert.equal(manifest.schema, "youeye.build.v2");
  assert.equal(manifest.component, "notes");
  assert.equal(manifest.executor.id, "koshka-lxc-625-v1");
  assert.equal(manifest.build_kind, "next-standalone");
  assert.equal(manifest.entrypoint, ".youeye/build/app");
  assert.equal(manifest.network.mode, "deny");
  assert.deepEqual(manifest.network.external_inputs, []);
  assert.deepEqual(manifest.unsigned_outputs.map(({ name }) => name), ["standalone.tar"]);
  assert.equal(manifest.validation_profile, "next-standalone-v1");
  assert.equal(manifest.publication_lane, "development");
  assert.match(entrypoint, /--frozen-lockfile --offline/);
  assert.doesNotMatch(entrypoint + helper, /openssl|gpg|forgejo|github api|publish/);
  assert.match(helper, /YOUEYE_SOURCE_COMMIT does not match/);
  assert.match(helper, /LICENSE TRADEMARK\.md THIRD_PARTY_NOTICES\.txt/);
});

test("package and install versions agree without changing the install source", async () => {
  const release = await inspectRelease(root);
  assert.equal(release.packageVersion, release.manifestVersion);
  assert.equal(pkg.packageManager, "pnpm@10.6.2");
  assert.match(yaml, /https:\/\/github\.com\/YouEye-Platform\/Notes/);
  assert.match(yaml, /repo:\s+potemsla\/YE-App-Notes/);
  assert.doesNotMatch(yaml, /repo:\s+YouEye-Platform\//);
});

test("release tag validation rejects malformed branches, versions, and tags", () => {
  assert.equal(expectedTag("main", "1.2.3"), "v1.2.3");
  assert.equal(expectedTag("beta", "1.2.3.1"), "beta-v1.2.3.1");
  for (const args of [["--version", "01.2.3"], ["--version", "1.2.3", "--branch", "feature/test"], ["--check", "--branch", "dev", "--tag", "v1.2.3"]]) {
    const result = cli(...args);
    assert.notEqual(result.status, 0, `${args.join(" ")} unexpectedly succeeded`);
  }
});

test("CLI detects source-version mismatches without modifying either file", async () => {
  const temporary = await temporarySource("1.2.3", "1.2.4");
  try {
    const before = await Promise.all([readFile(join(temporary, "package.json"), "utf8"), readFile(join(temporary, "youeye-app.yaml"), "utf8")]);
    const result = spawnSync(process.execPath, [resolve(root, "scripts/prepare-release.mjs"), "--check"], { encoding: "utf8", env: { ...process.env, YOUEYE_RELEASE_ROOT: temporary } });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /versions differ/);
    assert.deepEqual(await Promise.all([readFile(join(temporary, "package.json"), "utf8"), readFile(join(temporary, "youeye-app.yaml"), "utf8")]), before);
  } finally { await rm(temporary, { recursive: true, force: true }); }
});

test("paired version update restores both files when a staged rename fails", async () => {
  const temporary = await temporarySource();
  try {
    const state = await inspectRelease(temporary);
    const before = await Promise.all([readFile(state.packagePath, "utf8"), readFile(state.manifestPath, "utf8")]);
    let renameCalls = 0;
    await assert.rejects(() => updateSourceVersions(state, "2.0.0", { renameFile: async (...args) => { renameCalls += 1; if (renameCalls === 4) throw new Error("simulated rename failure"); const { rename } = await import("node:fs/promises"); return rename(...args); } }), /original version files were restored/);
    assert.deepEqual(await Promise.all([readFile(state.packagePath, "utf8"), readFile(state.manifestPath, "utf8")]), before);
  } finally { await rm(temporary, { recursive: true, force: true }); }
});

test("shell source-commit contract is syntax-valid and rejects a mismatched checkout", () => {
  execFileSync("bash", ["-n", ".youeye/build/app", ".youeye/build/lib.sh"], { cwd: root });
  const commit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  const command = `source .youeye/build/lib.sh; YOUEYE_SOURCE_DIR=${JSON.stringify(root)} YOUEYE_OUTPUT_DIR=$(mktemp -d) YOUEYE_WORK_DIR=$(mktemp -d) YOUEYE_SOURCE_COMMIT=${JSON.stringify("0".repeat(40))} app_prepare_contract`;
  const result = spawnSync("bash", ["-c", command], { cwd: root, encoding: "utf8" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /does not match the checked-out source commit/);
  assert.match(commit, /^[0-9a-f]{40}$/);
});
