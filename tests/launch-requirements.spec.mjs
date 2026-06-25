import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const root = join(import.meta.dirname, "..");

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

test("Notes surfaces launch requirements before using declared permissions", () => {
  const api = read("src/lib/api/index.ts");
  const layout = read("src/app/layout.tsx");
  const banner = read("src/components/launch-requirements-banner.tsx");
  const health = read("src/app/api/health/route.ts");
  const types = read("src/lib/types/index.ts");

  assert.match(api, /getLaunchRequirements\(userId: string, returnTo\?: string\)/);
  assert.ok(api.includes('process.env.YOUEYE_APP_ID || appId.replace(/^ye-/, "")'));
  assert.ok(api.includes('"X-YouEye-App": platformAppId'));
  assert.ok(api.includes("encodeURIComponent(platformAppId)"));
  assert.match(api, /launch-requirements/);
  assert.match(layout, /api\.getLaunchRequirements\(session\.userId, process\.env\.NOTES_EXTERNAL_URL/);
  assert.match(layout, /LaunchRequirementsBanner appName="Notes"/);
  assert.match(banner, /approval_url_absolute/);
  assert.match(banner, /needs permission to finish setup/);
  assert.match(health, /packageJson\.version/);
  assert.match(types, /export interface LaunchRequirements/);
});
