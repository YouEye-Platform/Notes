import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("runtime manifest exposes each installed surface exactly once with a real embed route", async () => {
  // Execute the route with only its HTTP serializer and package import replaced.
  const source = read("src/app/api/manifest/route.ts")
    .replace(/^import .*;\n/gm, "")
    .replace("export async function GET", "async function GET");
  const manifest = JSON.parse(JSON.stringify(await runInNewContext(`${source}\nGET()`, {
    packageJson: JSON.parse(read("package.json")),
    NextResponse: { json: (body) => body },
  })));
  const declared = [...read("youeye-app.yaml").split("\nsurfaces:\n")[1]
    .split(/\n[^ #\n]/)[0].matchAll(/^  - id: (.+)$/gm)].map((match) => match[1]);
  const ids = manifest.surfaces.map((surface) => surface.id);
  assert.equal(manifest.surfaceSchemaVersion, 1);
  assert.equal(new Set(ids).size, ids.length, "duplicate surface IDs");
  assert.deepEqual([...ids].sort(), declared.sort(), "runtime and install surface IDs differ");
  for (const surface of manifest.surfaces) {
    assert.ok(["widget", "settings-panel", "info-card", "timeline-card", "notification"].includes(surface.kind));
    assert.ok(surface.placement);
    assert.ok(Array.isArray(surface.permissions));
    assert.match(surface.embedPath, /^\/embed\//);
  }
});
