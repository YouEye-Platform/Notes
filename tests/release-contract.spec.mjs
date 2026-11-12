import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const manifest = JSON.parse(await readFile(resolve(root, ".youeye/build/manifest.json"), "utf8"));
const entrypoint = await readFile(resolve(root, ".youeye/build/app"), "utf8");
const helper = await readFile(resolve(root, ".youeye/build/lib.sh"), "utf8");
const yaml = await readFile(resolve(root, "youeye-app.yaml"), "utf8");
const pkg = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
const line = (await readFile(resolve(root, "VERSION"), "utf8")).trim();
const otherLine = `${Number(line.split(".")[0]) + 1}.0.0`;

async function temporaryDirectories(t) {
  const output = await mkdtemp(join(tmpdir(), "youeye-release-out-"));
  const work = await mkdtemp(join(tmpdir(), "youeye-release-work-"));
  t.after(() => Promise.all([rm(output, { recursive: true, force: true }), rm(work, { recursive: true, force: true })]));
  return { output, work };
}

function prepare(directories, env = {}) {
  const base = { ...process.env };
  delete base.YOUEYE_VERSION; delete base.YOUEYE_SOURCE_COMMIT; delete base.SOURCE_DATE_EPOCH;
  return spawnSync("bash", ["-c", "source .youeye/build/lib.sh; app_prepare_contract"], {
    cwd: root, encoding: "utf8",
    env: { ...base, YOUEYE_SOURCE_DIR: root, YOUEYE_OUTPUT_DIR: directories.output, YOUEYE_WORK_DIR: directories.work, ...env },
  });
}

test("source-owned build contract uses the supported unsigned standalone profile", () => {
  assert.equal(manifest.schema, "youeye.build.v2");
  assert.equal(manifest.component, "notes");
  assert.equal(manifest.executor.id, "koshka-lxc-625-v1");
  assert.equal(manifest.build_kind, "next-standalone");
  assert.equal(manifest.entrypoint, ".youeye/build/app");
  assert.equal(manifest.network.mode, "deny");
  assert.deepEqual(manifest.network.external_inputs, []);
  assert.deepEqual(manifest.unsigned_outputs.map(({ name }) => name), ["standalone.tar", "youeye-app.yaml"]);
  assert.equal(manifest.validation_profile, "next-node24-standalone-v2");
  assert.match(entrypoint, /--frozen-lockfile --offline/);
  assert.doesNotMatch(entrypoint + helper, /openssl|gpg|forgejo|github api|publish/);
  assert.match(helper, /YOUEYE_SOURCE_COMMIT does not match/);
  assert.match(helper, /LICENSE TRADEMARK\.md THIRD_PARTY_NOTICES\.txt/);
});

test("the source tree carries only the release line, never a build version", () => {
  assert.match(line, /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/);
  assert.equal(pkg.version, "0.0.0");
  assert.match(yaml, /^version: 0\.0\.0$/m);
  assert.equal(pkg.packageManager, "pnpm@10.6.2");
  assert.match(yaml, /https:\/\/github\.com\/YouEye-Platform\/Notes/);
  assert.doesNotMatch(yaml, /^\s*repo:/m, "the install manifest names no repository");
});

test("the build requires YOUEYE_VERSION on the VERSION line", async (t) => {
  const directories = await temporaryDirectories(t);
  const missing = prepare(directories);
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /YOUEYE_VERSION is required/);
  for (const [version, pattern] of [["v1.2.3", /must be X\.Y\.Z/], [line, /must be X\.Y\.Z/], [`${line}-rc.1`, /must be X\.Y\.Z/], [`${line}-dev.01`, /must be X\.Y\.Z/], [`${otherLine}-dev.1`, /not on the VERSION line/]]) {
    const result = prepare(directories, { YOUEYE_VERSION: version });
    assert.notEqual(result.status, 0, version);
    assert.match(result.stderr, pattern, version);
  }
  for (const version of [`${line}-dev.1`, `${line}-dev.12`]) {
    const result = prepare(directories, { YOUEYE_VERSION: version });
    assert.equal(result.status, 0, `${version}: ${result.stderr}`);
  }
});

test("release files carry the build version without changing the source", async (t) => {
  const directories = await temporaryDirectories(t);
  const output = join(directories.output, "release-manifest.json");
  const contract = join(directories.output, "youeye-app.yaml");
  const run = (version) => spawnSync(process.execPath, [join(root, "scripts/write-release-manifest.mjs")], {
    cwd: directories.work, encoding: "utf8",
    env: { ...process.env, YOUEYE_VERSION: version, YOUEYE_RELEASE_OUTPUT: output, YOUEYE_CONTRACT_OUTPUT: contract },
  });
  const result = run(`${line}-dev.3`);
  assert.equal(result.status, 0, result.stderr);
  const release = JSON.parse(await readFile(output, "utf8"));
  assert.deepEqual(release, { format: "product-local-release-metadata-v1", metadata_scope: "product-local",
    component: "notes", version: `${line}-dev.3`, artifact: "standalone.tar" });
  assert.equal(await readFile(contract, "utf8"), yaml.replace(/^version: 0\.0\.0$/m, `version: ${line}-dev.3`));
  assert.equal(await readFile(resolve(root, "youeye-app.yaml"), "utf8"), yaml);
  for (const version of ["", "latest", "1.2", line, `${line}-rc.3`]) assert.notEqual(run(version).status, 0, version);
});

test("shell source-commit contract is syntax-valid and rejects a mismatched checkout", async (t) => {
  const directories = await temporaryDirectories(t);
  const result = prepare(directories, { YOUEYE_SOURCE_COMMIT: "0".repeat(40), YOUEYE_VERSION: `${line}-dev.1` });
  assert.equal(spawnSync("bash", ["-n", ".youeye/build/app", ".youeye/build/lib.sh"], { cwd: root }).status, 0);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /does not match the checked-out source commit/);
});
