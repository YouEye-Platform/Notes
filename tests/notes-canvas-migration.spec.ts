/**
 * Notes Canvas Migration — Verification Tests
 *
 * Validates that Notes app works correctly after migrating from
 * custom auth/theme/header to Canvas template pattern.
 *
 * Attaches to the persistent Playwright session via CDP.
 * Uses the existing page (already authenticated) for UI tests.
 */

import { chromium, type Browser, type Page } from "playwright";

const NOTES_URL = "https://notes.devvm.test";
const CDP_ENDPOINT = "http://localhost:9222";

let browser: Browser;
let page: Page;

async function setup() {
  browser = await chromium.connectOverCDP(CDP_ENDPOINT);
  // Use the existing page from the persistent session (already authenticated)
  const ctx = browser.contexts()[0];
  page = ctx.pages()[0];
  if (!page) throw new Error("No existing page found in persistent session");
}

async function teardown() {
  // Don't close the page — it belongs to the persistent session
}

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  PASS: ${name}`);
  } catch (e) {
    console.error(`  FAIL: ${name}`);
    console.error(`    ${(e as Error).message}`);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function run() {
  console.log("\n=== Notes Canvas Migration Tests ===\n");

  await setup();

  await test("Health endpoint returns OK with database connected", async () => {
    const res = await page.goto(`${NOTES_URL}/api/health`);
    const body = await res!.json();
    assert(body.status === "ok", `Expected status ok, got ${body.status}`);
    assert(body.app === "ye-notes", `Expected app ye-notes, got ${body.app}`);
    assert(body.database === "connected", `Expected database connected, got ${body.database}`);
  });

  await test("Manifest endpoint returns correct app info", async () => {
    const res = await page.goto(`${NOTES_URL}/api/manifest`);
    const body = await res!.json();
    assert(body.id === "ye-notes", `Expected id ye-notes, got ${body.id}`);
    assert(body.name === "Notes", `Expected name Notes, got ${body.name}`);
    assert(body.surfaces?.some((surface: { kind: string }) => surface.kind === "widget"), "Expected at least one widget surface");
  });

  await test("SSO redirect works via Canvas factory", async () => {
    // Use a fresh context to test unauthenticated flow
    const ctx2 = await browser.newContext({ ignoreHTTPSErrors: true });
    const p2 = await ctx2.newPage();
    const res = await p2.goto(`${NOTES_URL}/api/auth/sso`, { waitUntil: "commit" });
    const url = res!.url();
    assert(url.includes("authorize"), `Expected redirect to authorize, got ${url}`);
    assert(url.includes("youeye-app-notes"), `Expected client_id youeye-app-notes in URL`);
    await ctx2.close();
  });

  await test("Canvas AppHeader renders with platform elements", async () => {
    await page.goto(NOTES_URL, { waitUntil: "networkidle" });
    const header = page.locator("header");
    assert(await header.isVisible(), "Header should be visible");
    const appName = header.locator("text=Notes");
    assert(await appName.isVisible(), "App name 'Notes' should be visible in header");
  });

  await test("New note page loads with Canvas header", async () => {
    await page.goto(`${NOTES_URL}/notes/new`, { waitUntil: "networkidle" });
    const header = page.locator("header");
    assert(await header.isVisible(), "Header should be visible on new note page");
    const backButton = page.locator("text=Back");
    assert(await backButton.isVisible(), "Back button should be visible");
  });

  await test("Notes CRUD via API works after migration", async () => {
    await page.goto(NOTES_URL, { waitUntil: "networkidle" });

    const createRes = await page.evaluate(async () => {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Canvas Migration Test", content: "Testing after Canvas migration" }),
      });
      return { status: res.status, body: await res.json() };
    });
    assert(createRes.status === 201, `Expected 201, got ${createRes.status}`);
    assert(createRes.body.data?.title === "Canvas Migration Test", "Created note title should match");

    const listRes = await page.evaluate(async () => {
      const res = await fetch("/api/notes");
      return { status: res.status, body: await res.json() };
    });
    assert(listRes.status === 200, `Expected 200, got ${listRes.status}`);
    assert(listRes.body.data?.length > 0, "Should have at least one note");

    // Clean up
    const noteId = createRes.body.data.id;
    await page.evaluate(async (id: string) => {
      await fetch(`/api/notes/${id}`, { method: "DELETE" });
    }, noteId);
  });

  await test("Settings endpoint works via Canvas factory", async () => {
    const res = await page.evaluate(async () => {
      const r = await fetch("/api/settings");
      return { status: r.status, body: await r.json() };
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  await test("Notifications endpoint works via Canvas factory", async () => {
    const res = await page.evaluate(async () => {
      const r = await fetch("/api/notifications");
      return { status: r.status, body: await r.json() };
    });
    assert(res.status !== 500, `Expected non-500, got ${res.status}`);
  });

  // Take a final screenshot for the report
  await page.goto(NOTES_URL, { waitUntil: "networkidle" });
  await page.screenshot({ path: "/tmp/shots/notes-canvas-final.png" });
  console.log("  Screenshot saved to /tmp/shots/notes-canvas-final.png");

  await teardown();

  console.log("\n=== Tests Complete ===\n");
}

run().catch(console.error);
