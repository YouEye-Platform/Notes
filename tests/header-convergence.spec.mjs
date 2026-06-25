import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const root = join(import.meta.dirname, "..");

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

test("Notes header uses the YouEye three-zone shell", () => {
  const header = read("src/lib/components/layout/app-header.tsx");
  const drawer = read("src/lib/components/layout/app-drawer.tsx");
  const notifications = read("src/lib/components/layout/notification-bell.tsx");
  const userMenu = read("src/lib/components/layout/user-menu.tsx");

  assert.match(header, /grid-cols-\[minmax\(0,1fr\)_minmax\(0,640px\)_minmax\(0,1fr\)\]/);
  assert.match(header, /href="\/"/);
  assert.match(header, /displayMode !== "text-only" && renderedIcon/);
  assert.match(header, /displayMode !== "icon-only"/);
  assert.match(header, /name=\{displayName\}/);
  assert.match(header, /children\?: React\.ReactNode/);
  assert.match(header, /children,\n}: AppHeaderProps/);
  assert.match(header, /const centerContent = children \?\?/);
  assert.match(header, /items-center justify-start/);
  assert.match(header, /items-center justify-center/);
  assert.match(header, /items-center justify-end gap-1/);
  assert.doesNotMatch(header, /absolute left-0/);
  assert.doesNotMatch(header, /calc\(100% - 200px\)/);
  assert.doesNotMatch(header, /siteName|logoUrl|resolvedSiteFontUrl/);
  assert.match(notifications, /inline-flex h-9 w-9 items-center justify-center rounded-md/);
  assert.match(notifications, /<Bell className="h-4 w-4" \/>/);
  assert.match(notifications, /absolute right-0\.5 top-0\.5 flex h-\[16px\] min-w-\[16px\]/);
  assert.match(notifications, /\/embed\/notifications\?mode=\$\{mode\}/);
  assert.match(notifications, /youeye:close/);
  assert.match(notifications, /youeye:notifications/);
  assert.match(notifications, /youeye:overlay-visibility/);
  assert.match(notifications, /prewarm/);
  assert.match(notifications, /active && loaded/);
  assert.match(notifications, /fixed inset-0 z-\[60\] h-screen w-screen/);
  assert.doesNotMatch(notifications, /youeye:resize|DEFAULT_HEIGHT|style=\{\{ height|absolute right-0 top-full/);
  assert.match(userMenu, /flex h-9 w-9 items-center justify-center/);
  assert.match(userMenu, /flex size-\[76px\] items-center justify-center/);
  assert.doesNotMatch(userMenu, /-ml-0\.5/);
  assert.match(drawer, /<DotsIcon className="h-4 w-4" \/>/);
  assert.doesNotMatch(drawer, /setEdit|editDrawer|Done Editing|GripVertical|draggedAppId/);
  assert.match(drawer, /type OverlayKind = "drawer" \| "launcher"/);
  assert.match(drawer, /\/embed\/\$\{kind\}\?mode=\$\{mode\}/);
  assert.match(drawer, /youeye:close/);
  assert.match(drawer, /youeye:overlay-visibility/);
  assert.match(drawer, /prewarm/);
  assert.match(drawer, /active && loaded/);
  assert.match(drawer, /youeye:overlay-command/);
  assert.match(drawer, /command === "open-launcher"/);
  assert.doesNotMatch(drawer, /action === "open-launcher"/);
  assert.match(drawer, /fixed inset-0 z-\[60\] h-screen w-screen/);
  assert.match(drawer, /sandbox=\{SANDBOX\}/);
  assert.doesNotMatch(drawer, /drawerHeight|youeye:resize|absolute right-0 top-full|shadow-sm|bg-accent\/80|rounded-full/);
});
