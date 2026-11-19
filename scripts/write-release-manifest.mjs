#!/usr/bin/env node
// Writes the build's release files from the release line (YOUEYE_LINE, X.Y.Z, equal to
// VERSION) and the git tree (YOUEYE_SOURCE_TREE), both set by .youeye/build/lib.sh:
// release-manifest.json inside the standalone tree, and the release copy of
// youeye-app.yaml (the install contract) with its version set to the line.
// Neither names a build (X.Y.Z-dev.N): the same files are promoted under other
// names, and the Control Panel versions an installed app by its release document.
// The source youeye-app.yaml keeps the 0.0.0 placeholder and is never modified.
import { readFile, writeFile } from "node:fs/promises";

const COMPONENT = "notes";
const LINE = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/;
const line = process.env.YOUEYE_LINE || "";
const tree = process.env.YOUEYE_SOURCE_TREE || "";
const output = process.env.YOUEYE_RELEASE_OUTPUT;
const contract = process.env.YOUEYE_CONTRACT_OUTPUT;
if (!LINE.test(line)) throw new Error("YOUEYE_LINE (the release line X.Y.Z) is required");
const sourceLine = (await readFile(new URL("../VERSION", import.meta.url), "utf8")).trim();
if (line !== sourceLine) throw new Error(`YOUEYE_LINE ${line} is not the VERSION line ${sourceLine}`);
if (!/^[0-9a-f]{40}$/.test(tree)) throw new Error("YOUEYE_SOURCE_TREE (the 40-character git tree) is required");
if (!output || !contract) throw new Error("YOUEYE_RELEASE_OUTPUT and YOUEYE_CONTRACT_OUTPUT are required");
const manifest = await readFile(new URL("../youeye-app.yaml", import.meta.url), "utf8");
if ((manifest.match(/^version:.*$/gm) ?? []).length !== 1) throw new Error("youeye-app.yaml must contain exactly one root version field");
await writeFile(contract, manifest.replace(/^version:.*$/m, `version: ${line}`));
await writeFile(output, `${JSON.stringify({
  format: "product-local-release-metadata-v1",
  metadata_scope: "product-local",
  component: COMPONENT,
  version: line,
  source_tree: tree,
  artifact: "standalone.tar",
}, null, 2)}\n`);
