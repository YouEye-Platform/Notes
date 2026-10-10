import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
const require = createRequire(import.meta.url);
const ts = require("typescript");
function load(env, browser = false) {
  const source = readFileSync(new URL("../src/lib/api/service-headers.ts", import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  runInNewContext(code, { exports, process: { env }, Headers, ...(browser ? { window: {} } : {}) });
  return exports.appServiceHeaders;
}
const env = { YOUEYE_APP_ID: "ye-wiki", YOUEYE_APP_TOKEN: "opaque-fixture" };
test("runtime canonical app and validated acting user override every form of supplied headers", () => {
  const make = load(env);
  for (const extra of [
    { authorization: "Bearer other", "x-youeye-app": "wiki", "x-youeye-user": "victim", "x-ui-bridge-token": "bridge", cookie: "admin=fixture", "x-cli-token": "fixture" },
    new Headers({ "X-YouEye-App": "notes", "X-YouEye-User": "victim" }),
    [["X-YouEye-App", "notes"], ["X-YouEye-User", "victim"], ["Accept", "application/json"]],
  ]) {
    const headers = make(extra, "session-subject");
    assert.equal(headers.get("authorization"), "Bearer opaque-fixture");
    assert.equal(headers.get("x-youeye-app"), "ye-wiki");
    assert.equal(headers.get("x-youeye-user"), "session-subject");
    for (const name of ["cookie", "x-cli-token", "x-ui-bridge-token"]) assert.equal(headers.get(name), null);
    assert.equal(make(extra).get("x-youeye-user"), null);
  }
});
test("missing/corrupt runtime identity and browser use fail before any unauthenticated service call", () => {
  for (const missing of [{}, { ...env, YOUEYE_APP_TOKEN: "" }, { ...env, YOUEYE_APP_TOKEN: "two tokens" }, { ...env, YOUEYE_APP_ID: "../wiki" }, { ...env, YOUEYE_APP_ID: "wiki,notes" }]) {
    assert.throws(() => load(missing)(), /integration is not ready/);
  }
  assert.throws(() => load(env, true)(), /server-only/);
});
