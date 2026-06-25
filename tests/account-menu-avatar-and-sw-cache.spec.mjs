import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const root = process.env.APP_ROOT || join(import.meta.dirname, "..");

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function firstExisting(paths) {
  const found = paths.find((candidate) => existsSync(join(root, candidate)));
  assert.ok(found, `Missing expected source file from candidates: ${paths.join(", ")}`);
  return read(found);
}

function userMenuSource() {
  return firstExisting([
    "src/components/layout/user-menu.tsx",
    "src/lib/components/layout/user-menu.tsx",
  ]);
}

function headerSource() {
  return firstExisting([
    "src/lib/components/layout/app-header.tsx",
    "src/components/layout/wiki-header.tsx",
    "src/components/layout/cinema-header.tsx",
    "src/components/layout/weather-header.tsx",
    "src/components/layout/translate-header.tsx",
  ]);
}

function mobileSheetSource() {
  return firstExisting([
    "src/components/layout/mobile-account-sheet.tsx",
    "src/lib/components/layout/mobile-account-sheet.tsx",
  ]);
}

test("native account menu renders the platform avatar URL with initials fallback", () => {
  const menu = userMenuSource();

  assert.match(menu, /avatarUrl?: string | null/);
  assert.match(menu, /<img src={avatarUrl}/);
  assert.match(menu, /alt={username}|avatarAlt/);
  assert.match(menu, /initials/);
});

test("native mobile shell renders a bottom account button with sheet embeds", () => {
  const header = headerSource();
  const sheet = mobileSheetSource();

  assert.match(header, /ye-mobile-shell-only/);
  assert.match(header, /ye-mobile-top-actions/);
  assert.match(header, /<MobileAccountSheet/);
  assert.match(header, /ye-mobile-shell-spacer/);
  assert.match(sheet, /surface: "sheet"/);
  assert.ok(sheet.includes("/embed/${kind}"));
  assert.match(sheet, /youeye:notifications/);
  assert.match(sheet, /initialCount/);
});

test("embed surfaces suppress the top-level mobile account shell", () => {
  const globals = read("src/app/globals.css");
  const embed = firstExisting([
    "src/lib/embed/index.tsx",
    "src/app/embed/layout.tsx",
  ]);

  assert.match(embed, /ye-mobile-shell-only, \.ye-mobile-shell-spacer/);
  assert.match(embed, /display: none !important/);
  assert.match(globals, /body\.embed-mode \.ye-mobile-shell-only/);
  assert.match(globals, /body\.embed-mode \.ye-mobile-shell-spacer/);
});

test("service worker uses Serwist instead of hand-rolled install precaching", () => {
  const sw = read("src/app/sw.ts");

  assert.ok(sw.includes("new Serwist("));
  assert.ok(sw.includes("precacheEntries: self.__SW_MANIFEST ?? []"));
  assert.ok(sw.includes("serwist.addEventListeners()"));
  assert.ok(sw.includes("LEGACY_CACHE_PREFIXES"));
  assert.ok(!sw.includes('self.addEventListener("install"'));
  assert.ok(!sw.includes("PRECACHE_ENTRIES.map"));
  assert.ok(!sw.includes("event.respondWith"));
});
