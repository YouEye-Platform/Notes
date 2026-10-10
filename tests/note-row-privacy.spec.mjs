import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const owner = '11111111-1111-4111-8111-111111111111';
const foreign = '22222222-2222-4222-8222-222222222222';
const tag = '33333333-3333-4333-8333-333333333333';
const folder = '44444444-4444-4444-8444-444444444444';
function load(path, mocks) {
  const source = readFileSync(new URL('../' + path, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, URL, Response, require(name) {
    if (name in mocks) return mocks[name];
    throw Error('Unexpected dependency: ' + name);
  } });
  return exports;
}
function fixture({ noteOwner = owner, tagOwner = owner, folderOwner = owner } = {}) {
  const writes = [];
  const db = {
    getOne: async (sql, args) => {
      if (sql.startsWith('SELECT id FROM notes')) return args[1] === noteOwner ? { id: 'note' } : null;
      if (sql.startsWith('SELECT id FROM folders')) return args[1] === folderOwner ? { id: folder } : null;
      if (sql.startsWith('INSERT') || sql.startsWith('UPDATE')) writes.push({ sql, args });
      return { id: 'note', title: '', content: '', tags: [] };
    },
    getMany: async (_sql, args) => args[0] === tagOwner ? [{ id: tag }] : [],
    query: async (sql, args) => { writes.push({ sql, args }); return { rows: [] }; },
  };
  const references = load('src/lib/notes/private-references.ts', { '@/lib/db/client': db });
  const mocks = {
    'next/server': { NextResponse: { json: Response.json } },
    '@/lib/auth': { getSession: async () => ({ userId: owner }) },
    '@/lib/db/client': db,
    '@/lib/db/migrate': { runMigrations: async () => {} },
    '@/lib/notes/private-references': references,
    '@/lib/timeline/emit': { emitNoteEdited: async () => {}, emitNoteCreated: async () => {} },
    crypto: { randomBytes: () => { throw Error('Sharing is outside this fixture'); } },
  };
  return { writes, item: load('src/app/api/notes/[id]/route.ts', mocks), collection: load('src/app/api/notes/route.ts', mocks) };
}
const request = body => new Request('https://notes.example/api/notes/note', {
  method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
});
const params = { params: Promise.resolve({ id: 'note' }) };

test('tag-only update of a foreign note returns404 without any relationship mutation', async () => {
  const f = fixture({ noteOwner: foreign });
  assert.equal((await f.item.PUT(request({ tag_ids: [] }), params)).status, 404);
  assert.deepEqual(f.writes, []);
});
for (const [name, body, options] of [
  ['foreign tag', { tag_ids: [tag] }, { tagOwner: foreign }],
  ['foreign folder', { folder_id: folder }, { folderOwner: foreign }],
]) {
  for (const action of ['PUT', 'POST']) test(`${action} rejects ${name} before writing a note or relationships`, async () => {
    const f = fixture(options);
    const response = action === 'PUT' ? await f.item.PUT(request(body), params) : await f.collection.POST(request(body));
    assert.equal(response.status, 404);
    assert.deepEqual(f.writes, []);
  });
}
test('valid own tag-only update retains the supported200 response and guarded mutation', async () => {
  const f = fixture();
  assert.equal((await f.item.PUT(request({ tag_ids: [tag] }), params)).status, 200);
  assert.equal(f.writes.length, 2);
  assert.deepEqual(Array.from(f.writes[0].args), ['note', owner]);
});
test('clearing own tags and folder remains supported', async () => {
  const f = fixture();
  assert.equal((await f.item.PUT(request({ tag_ids: [], folder_id: null }), params)).status, 200);
  assert.equal(f.writes.length, 2);
});
for (const body of [{ tag_ids: 'invalid' }, { tag_ids: ['not-a-uuid'] }, { folder_id: 42 }]) {
  test(`invalid relationship input ${JSON.stringify(body)} fails before writes`, async () => {
    const f = fixture();
    assert.equal((await f.item.PUT(request(body), params)).status, 400);
    assert.deepEqual(f.writes, []);
  });
}
