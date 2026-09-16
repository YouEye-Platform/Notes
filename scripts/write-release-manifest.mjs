#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const output = process.env.YOUEYE_RELEASE_OUTPUT;
const commit = process.env.YOUEYE_SOURCE_COMMIT || "";
const branch = process.env.YOUEYE_SOURCE_BRANCH || "detached";
if (!output) throw new Error("YOUEYE_RELEASE_OUTPUT is required");
if (!/^[0-9a-f]{40}$/.test(commit)) throw new Error("exact source commit is required");
if (branch !== "detached" && !/^[a-z0-9_-]+$/.test(branch)) throw new Error("invalid source branch");
const packageJson = JSON.parse(await readFile(resolve("package.json"), "utf8"));
await writeFile(output, `${JSON.stringify({
  format: "product-local-release-metadata-v1",
  metadata_scope: "product-local",
  component: "notes",
  version: packageJson.version,
  repository: "https://github.com/YouEye-Platform/YE-App-Notes",
  branch,
  commit,
  artifact: "standalone.tar",
}, null, 2)}\n`);
