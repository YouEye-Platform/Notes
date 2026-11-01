import assert from "node:assert/strict";
import test from "node:test";
import { postAdmittedTimeline } from "../src/lib/api/timeline.ts";
const revision = "e601ca02-6c56-4bdb-a6f5-55735df464d3";
const enabledAt = "2026-10-28T00:00:00.000Z";
const event = { timestamp: "2026-10-28T01:00:00.000Z", title: "Fixture payload" };
test("Off, missing, denied, unknown and old-interval events never send payloads", async () => {
  for (const state of [{ enabled: false }, {}, { enabled: true }, { enabled: true, revision, enabledAt: "2026-10-28T02:00:00.000Z" }, null]) {
    const calls = [];
    await postAdmittedTimeline(async (path, options, userId) => {
      calls.push({ path, options, userId });
      return state === null ? new Response(null, { status: 503 }) : Response.json(state);
    }, "account-a", "history", event);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].path, "/timeline/collection");
    assert.equal(calls[0].options.body, undefined);
    assert.equal(calls[0].userId, "account-a");
    assert.equal(calls[0].options.cache, "no-store");
  }
});
test("fresh enabled collection uses its exact revision and never retries a rejected write", async () => {
  const calls = [];
  await postAdmittedTimeline(async (path, options, userId) => {
    calls.push({ path, options, userId });
    return path.endsWith("/collection") ? Response.json({ enabled: true, revision, enabledAt }) : new Response(null, { status: 409 });
  }, "account-b", "history", event);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].userId, "account-b");
  assert.deepEqual(JSON.parse(calls[1].options.body), { ...event, collection: "history", collection_revision: revision });
});
