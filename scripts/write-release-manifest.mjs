#!/usr/bin/env node
// Writes the build's release files from the build version (YOUEYE_VERSION, X.Y.Z-dev.N):
// release-manifest.json inside the standalone tree, and the release copy of
// youeye-app.yaml (the install contract) with its version set to the build version.
// The source youeye-app.yaml keeps the 0.0.0 placeholder and is never modified.
import { readFile, writeFile } from "node:fs/promises";

const COMPONENT = "notes";
const VERSION = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)-dev\.[1-9][0-9]*$/;
const version = process.env.YOUEYE_VERSION || "";
const output = process.env.YOUEYE_RELEASE_OUTPUT;
const contract = process.env.YOUEYE_CONTRACT_OUTPUT;
if (!VERSION.test(version)) throw new Error("YOUEYE_VERSION (X.Y.Z-dev.N) is required");
if (!output || !contract) throw new Error("YOUEYE_RELEASE_OUTPUT and YOUEYE_CONTRACT_OUTPUT are required");
const manifest = await readFile(new URL("../youeye-app.yaml", import.meta.url), "utf8");
if ((manifest.match(/^version:.*$/gm) ?? []).length !== 1) throw new Error("youeye-app.yaml must contain exactly one root version field");
await writeFile(contract, manifest.replace(/^version:.*$/m, `version: ${version}`));
await writeFile(output, `${JSON.stringify({
  format: "product-local-release-metadata-v1",
  metadata_scope: "product-local",
  component: COMPONENT,
  version,
  artifact: "standalone.tar",
}, null, 2)}\n`);
