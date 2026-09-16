#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { chmod, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const root = resolve(process.env.YOUEYE_RELEASE_ROOT || defaultRoot);
const versionPattern = /^(?:0|[1-9]\d*)(?:\.(?:0|[1-9]\d*)){0,9}$/;
const branchPattern = /^[a-z0-9_-]+$/;

function validateVersion(version) {
  if (!versionPattern.test(version)) throw new Error("version must contain 1-10 numeric segments without leading zeroes");
}

export function expectedTag(branch, version) {
  if (!branchPattern.test(branch)) throw new Error("branch must use lowercase letters, digits, underscores, or hyphens");
  validateVersion(version);
  return branch === "main" ? `v${version}` : `${branch}-v${version}`;
}

function parseArguments(args) {
  const options = { check: false, version: "", branch: "", tag: "" };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--check") options.check = true;
    else if (["--version", "--branch", "--tag"].includes(argument)) {
      const value = args[index + 1];
      if (!value) throw new Error(`${argument} requires a value`);
      options[argument.slice(2)] = value;
      index += 1;
    } else throw new Error(`unknown argument: ${argument}`);
  }
  if (!options.check && !options.version) throw new Error("--version is required unless --check is used");
  if (options.tag && !options.branch) throw new Error("--tag requires --branch");
  return options;
}

export async function inspectRelease(rootDirectory = root) {
  const packagePath = resolve(rootDirectory, "package.json");
  const manifestPath = resolve(rootDirectory, "youeye-app.yaml");
  const packageJson = JSON.parse(await readFile(packagePath, "utf8"));
  const manifestText = await readFile(manifestPath, "utf8");
  const matches = [...manifestText.matchAll(/^version:\s*["']?([^"'\s]+)["']?\s*$/gm)];
  if (matches.length !== 1) throw new Error("youeye-app.yaml must contain exactly one root version field");
  const manifestVersion = matches[0][1];
  validateVersion(packageJson.version);
  validateVersion(manifestVersion);
  return { packagePath, manifestPath, packageJson, manifestText, packageVersion: packageJson.version, manifestVersion };
}

export function assertSourceConsistency(state) {
  if (state.packageVersion !== state.manifestVersion) throw new Error("package.json and youeye-app.yaml versions differ");
}

async function removeTemporaryFiles(removeFile, paths) {
  const results = await Promise.allSettled(paths.map((path) => removeFile(path, { force: true })));
  return results.filter(({ status }) => status === "rejected").map(({ reason }) => reason instanceof Error ? reason.message : String(reason));
}

export async function updateSourceVersions(state, version, { renameFile = rename, removeFile = rm } = {}) {
  validateVersion(version);
  const packageText = `${JSON.stringify({ ...state.packageJson, version }, null, 2)}\n`;
  const manifestText = state.manifestText.replace(/^version:\s*["']?[^"'\s]+["']?\s*$/m, `version: ${version}`);
  const suffix = `.release-${process.pid}-${randomUUID()}`;
  const packageTemporary = `${state.packagePath}${suffix}.next`;
  const manifestTemporary = `${state.manifestPath}${suffix}.next`;
  const packageBackup = `${state.packagePath}${suffix}.bak`;
  const manifestBackup = `${state.manifestPath}${suffix}.bak`;
  let packageBackedUp = false;
  let manifestBackedUp = false;
  let packageInstalled = false;
  let manifestInstalled = false;

  const [packageMode, manifestMode] = await Promise.all([
    stat(state.packagePath).then(({ mode }) => mode & 0o777),
    stat(state.manifestPath).then(({ mode }) => mode & 0o777),
  ]);

  try {
    await Promise.all([
      writeFile(packageTemporary, packageText, { mode: packageMode }),
      writeFile(manifestTemporary, manifestText, { mode: manifestMode }),
    ]);
    await Promise.all([chmod(packageTemporary, packageMode), chmod(manifestTemporary, manifestMode)]);
    const [stagedPackage, stagedManifest] = await Promise.all([
      readFile(packageTemporary, "utf8"),
      readFile(manifestTemporary, "utf8"),
    ]);
    const escapedVersion = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (JSON.parse(stagedPackage).version !== version || !new RegExp(`^version:\\s*${escapedVersion}\\s*$`, "m").test(stagedManifest)) {
      throw new Error("staged version files failed validation");
    }

    await renameFile(state.packagePath, packageBackup);
    packageBackedUp = true;
    await renameFile(state.manifestPath, manifestBackup);
    manifestBackedUp = true;
    await renameFile(packageTemporary, state.packagePath);
    packageInstalled = true;
    await renameFile(manifestTemporary, state.manifestPath);
    manifestInstalled = true;
  } catch (error) {
    const restorationErrors = [];
    for (const [label, backedUp, installed, backup, destination] of [
      ["package.json", packageBackedUp, packageInstalled, packageBackup, state.packagePath],
      ["youeye-app.yaml", manifestBackedUp, manifestInstalled, manifestBackup, state.manifestPath],
    ]) {
      if (!backedUp) continue;
      try {
        if (installed) await removeFile(destination, { force: true });
        await renameFile(backup, destination);
      } catch (restoreError) {
        restorationErrors.push(`${label}: ${restoreError.message}`);
      }
    }
    const cleanupErrors = await removeTemporaryFiles(removeFile, [packageTemporary, manifestTemporary]);
    if (restorationErrors.length || cleanupErrors.length) {
      throw new Error(`release version update failed and requires recovery (${[...restorationErrors, ...cleanupErrors.map((message) => `cleanup: ${message}`)].join("; ")})`, { cause: error });
    }
    throw new Error("release version update failed; original version files were restored", { cause: error });
  }

  const cleanupErrors = await removeTemporaryFiles(removeFile, [packageBackup, manifestBackup]);
  if (cleanupErrors.length) {
    throw new Error("release version update succeeded but backup cleanup failed; source versions remain updated", { cause: new Error(cleanupErrors.join("; ")) });
  }
}

export async function main(args = process.argv.slice(2)) {
  const options = parseArguments(args);
  const state = await inspectRelease();
  if (options.check) {
    assertSourceConsistency(state);
    if (options.version && options.version !== state.packageVersion) throw new Error("requested version does not match source version");
    if (options.branch) {
      const expected = expectedTag(options.branch, state.packageVersion);
      if (!options.tag) throw new Error("--branch requires --tag for release identity validation");
      if (options.tag !== expected) throw new Error(`tag must be ${expected}`);
    }
    console.log(`release contract valid for ${state.packageVersion}`);
    return;
  }
  validateVersion(options.version);
  if (options.branch) {
    const expected = expectedTag(options.branch, options.version);
    if (!options.tag) throw new Error("--branch requires --tag for release identity validation");
    if (options.tag !== expected) throw new Error(`tag must be ${expected}`);
  }
  await updateSourceVersions(state, options.version);
  const prepared = await inspectRelease();
  assertSourceConsistency(prepared);
  console.log(`prepared release version ${options.version}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(`prepare-release: ${error.message}`); process.exitCode = 1; });
}
