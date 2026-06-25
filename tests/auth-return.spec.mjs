import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const root = join(import.meta.dirname, "..");

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

test("Notes auth redirects use the external app URL and preserve return destinations", () => {
  const route = read("src/lib/routes/auth/index.ts");

  assert.match(route, /externalBaseUrl/);
  assert.match(route, /x-forwarded-host/);
  assert.match(route, /!host\.includes\("0\.0\.0\.0"\)/);
  assert.match(route, /\$\{config\.appId\}-oauth-redirect/);
  assert.match(route, /!postLoginRedirect\.startsWith\("\/\/"\)/);
  assert.doesNotMatch(route, /new URL\("\/api\/auth\/sso", request\.url\)/);
});
