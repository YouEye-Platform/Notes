import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isYouEyeAdmin, YOUEYE_ADMIN_GROUP } from "../src/lib/auth/admin.ts";

test("only YouEye ID's exact admin group makes an app admin", () => {
  assert.equal(YOUEYE_ADMIN_GROUP, "admin");
  assert.equal(isYouEyeAdmin(["youeye-users", "admin"]), true);
  assert.equal(isYouEyeAdmin(["admin"]), true);
  for (const groups of [
    ["youeye-users"], ["sysadmins-readonly"], ["not-admin"], ["Admin"], ["ADMIN"], ["admins"], [" admin"],
    [], undefined, null, "admin", [["admin"]],
  ]) {
    assert.equal(isYouEyeAdmin(groups), false, JSON.stringify(groups));
  }
});

test("the sign-in callback derives isAdmin from the exact group check", () => {
  const route = readFileSync(new URL("../src/lib/routes/auth/index.ts", import.meta.url), "utf8");
  assert.match(route, /const isAdmin = isYouEyeAdmin\(userInfo\.groups\);/);
  assert.doesNotMatch(route, /includes\("admin"\)/);
});
