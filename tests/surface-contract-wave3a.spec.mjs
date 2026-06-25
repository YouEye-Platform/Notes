import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const root = process.env.APP_ROOT || join(import.meta.dirname, "..");

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function has(path) {
  return existsSync(join(root, path));
}

function sourceFiles(dir) {
  const abs = join(root, dir);
  const out = [];
  for (const entry of readdirSync(abs)) {
    const path = join(abs, entry);
    const rel = join(dir, entry);
    const st = statSync(path);
    if (st.isDirectory()) out.push(...sourceFiles(rel));
    else if (/\.(tsx?|jsx?)$/.test(entry)) out.push(rel);
  }
  return out;
}

test("Notes declares the Wave 3A surface contract", () => {
  const route = read("src/app/api/manifest/route.ts");
  const yaml = read("youeye-app.yaml");
  const types = read("src/lib/types/index.ts");

  assert.ok(route.includes("surfaceSchemaVersion: 1"));
  assert.ok(yaml.includes("surfaceSchemaVersion: 1"));
  assert.ok(route.includes('kind: "settings-panel"'));
  assert.ok(yaml.includes("kind: settings-panel"));
  assert.ok(route.includes('embedPath: "/embed/settings"'));
  assert.ok(yaml.includes("embedPath: /embed/settings"));
  assert.ok(types.includes("settings-panel"));
  assert.ok(has("src/app/embed/settings/page.tsx"));

  assert.ok(route.includes('kind: "notification"'));
  assert.ok(yaml.includes("kind: notification"));
  assert.ok(route.includes('embedPath: "/embed/notification/default"'));
  assert.ok(yaml.includes("embedPath: /embed/notification/default"));
  assert.ok(has("src/app/embed/notification/default/page.tsx"));

});

test("Notes runtime source no longer emits legacy embed messages", () => {
  const combined = sourceFiles("src").map((file) => read(file)).join("\n");
  assert.doesNotMatch(combined, /youeye-embed-ready|youeye-embed-resize|youeye-card-ready|youeye-app-settings-resize|contentHeight|settings\?embed=true/);
});
