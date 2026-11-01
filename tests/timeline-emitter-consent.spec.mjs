import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { postAdmittedTimeline } from "../src/lib/api/timeline.ts";

const revision = "e601ca02-6c56-4bdb-a6f5-55735df464d3";
const actionTime = Date.parse("2026-10-28T12:00:00.000Z");
const cases = [
  ["emitNoteCreated", ["account-a", "note-a", "Title", "Content"]],
  ["emitNoteEdited", ["account-a", "note-a", "Title", "Content"]],
];

// Execute the real emitter with only its I/O dependencies replaced. The real
// admission helper still decides whether a payload may leave the process.
function fixture() {
  const started = Promise.withResolvers();
  const resume = Promise.withResolvers();
  const finished = Promise.withResolvers();
  const calls = [];
  let state = { enabled: false };
  const source = stripTypeScriptTypes(
    readFileSync(new URL("../src/lib/timeline/emit.ts", import.meta.url), "utf8")
  ).replace(/^import .+;\r?\n/gm, "").replaceAll("export async function", "async function");
  const emitters = runInNewContext(`${source}\n({${cases.map(([name]) => name).join(",")}})`, {
    Date,
    getActivityTranslator: async userId => {
      assert.equal(userId, "account-a");
      started.resolve();
      await resume.promise;
      return { t: key => key };
    },
    createApiClient: appId => {
      assert.equal(appId, "ye-notes");
      return {
        postTimelineEntry: async (userId, collection, entry) => {
          await postAdmittedTimeline(
            async (path, options, account) => {
              calls.push({ path, options, account });
              return path === "/timeline/collection" ? Response.json(state) : new Response(null, { status: 204 });
            }, userId, collection, entry
          );
          finished.resolve();
        },
      };
    },
  });
  return { emitters, started, resume, finished, calls, collection: value => { state = value; } };
}

function routeFixture(path, emitters, getSession) {
  const source = stripTypeScriptTypes(
    readFileSync(new URL(`../src/app/${path}/route.ts`, import.meta.url), "utf8")
  ).replace(/^import .+;\r?\n/gm, "").replaceAll("export async function", "async function");
  const note = { id: "note-a", title: "Title", content: "Content", tags: [] };
  return runInNewContext(`${source}\n({${path.endsWith("[id]") ? "PUT" : "POST"}})`, {
    Date, URL, Response,
    NextResponse: { json: Response.json },
    getSession,
    runMigrations: async () => {},
    getOne: async () => note,
    getMany: async () => [],
    query: async () => ({ rows: [note] }),
    validatePrivateNoteReferences: async () => null,
    ...emitters,
  });
}

for (const [name, path, method] of [
  ["note creation", "api/notes", "POST"],
  ["note editing", "api/notes/[id]", "PUT"],
]) {
  for (const lateConsent of [true, false]) {
    test(`${name}: request time survives database work and locale await (${lateConsent ? "late consent rejects the event" : "enabled activity keeps its original time"})`, { timeout: 5000 }, async context => {
      context.mock.timers.enable({ apis: ["Date"], now: actionTime });
      const f = fixture();
      const admitted = Promise.withResolvers();
      const auth = Promise.withResolvers();
      const handler = routeFixture(path, f.emitters, async () => {
        admitted.resolve();
        await auth.promise;
        return { userId: "account-a" };
      });
      if (!lateConsent) f.collection({ enabled: true, revision, enabledAt: new Date(actionTime - 1000).toISOString() });
      const pending = handler[method](new Request("https://notes.example/api/notes/note-a", {
        method, headers: { "content-type": "application/json" }, body: JSON.stringify({ title: "Title", content: "Content" }),
      }), { params: Promise.resolve({ id: "note-a" }) });
      await admitted.promise;
      context.mock.timers.tick(500);
      auth.resolve();
      await f.started.promise;
      context.mock.timers.tick(1000);
      if (lateConsent) f.collection({ enabled: true, revision, enabledAt: new Date().toISOString() });
      f.resume.resolve();
      assert.ok((await pending).ok);
      await f.finished.promise;
      const posts = f.calls.filter(call => call.path === "/timeline");
      assert.equal(posts.length, lateConsent ? 0 : 1);
      assert.equal(f.calls.filter(call => call.path === "/timeline/collection").length, 1);
      for (const call of f.calls) assert.equal(call.account, "account-a");
      for (const call of posts) {
        const payload = JSON.parse(call.options.body);
        assert.equal(payload.timestamp, new Date(actionTime).toISOString());
        assert.equal(payload.collection_revision, revision);
      }
    });
  }
}

for (const [name, args] of cases) {
  test(`${name}: a locale delay cannot move an off-period action into newly enabled collection`, async context => {
    context.mock.timers.enable({ apis: ["Date"], now: actionTime });
    const f = fixture();
    const pending = f.emitters[name](...args);
    await f.started.promise;
    context.mock.timers.tick(1000);
    f.collection({ enabled: true, revision, enabledAt: new Date().toISOString() });
    f.resume.resolve();
    await pending;
    assert.equal(f.calls.length, 1, "no Timeline POST after late consent");
    assert.equal(f.calls[0].path, "/timeline/collection");
    assert.equal(f.calls[0].options.cache, "no-store");
    assert.equal(f.calls[0].account, "account-a");
    assert.equal(f.calls[0].options.body, undefined);
  });

  test(`${name}: enabled activity retains its timestamp across locale lookup`, async context => {
    context.mock.timers.enable({ apis: ["Date"], now: actionTime });
    const f = fixture();
    f.collection({ enabled: true, revision, enabledAt: new Date(actionTime - 1000).toISOString() });
    const pending = f.emitters[name](...args);
    await f.started.promise;
    context.mock.timers.tick(2000);
    f.resume.resolve();
    await pending;
    assert.equal(f.calls.length, 2);
    assert.equal(f.calls[1].path, "/timeline");
    assert.equal(f.calls[1].account, "account-a");
    const payload = JSON.parse(f.calls[1].options.body);
    assert.equal(payload.timestamp, new Date(actionTime).toISOString());
    assert.equal(payload.collection_revision, revision);
    assert.equal(payload.collection, "history");
  });

  test(`${name}: an earlier caller timestamp is not replaced by emitter time`, async context => {
    context.mock.timers.enable({ apis: ["Date"], now: actionTime });
    const f = fixture();
    f.collection({ enabled: true, revision, enabledAt: new Date(actionTime - 2000).toISOString() });
    const original = new Date(actionTime - 1000).toISOString();
    const pending = f.emitters[name](...args, original);
    f.resume.resolve();
    await pending;
    assert.equal(f.calls.length, 2);
    assert.equal(JSON.parse(f.calls[1].options.body).timestamp, original);
  });

  test(`${name}: a caller timestamp before the collection interval remains rejected`, async context => {
    context.mock.timers.enable({ apis: ["Date"], now: actionTime });
    const f = fixture();
    f.collection({ enabled: true, revision, enabledAt: new Date(actionTime - 1000).toISOString() });
    const pending = f.emitters[name](...args, new Date(actionTime - 2000).toISOString());
    f.resume.resolve();
    await pending;
    assert.equal(f.calls.length, 1);
    assert.equal(f.calls[0].path, "/timeline/collection");
  });
}
