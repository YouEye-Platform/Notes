import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const root = join(import.meta.dirname, '..');
const next = { NextResponse: {
  json: (body, init) => Response.json(body, init),
  next: () => ({ status: 200, next: true }),
  redirect: () => ({ status: 307, cookies: { delete() {} } }),
} };
function load(path, mocks = {}, extras = {}) {
  const code = ts.transpileModule(readFileSync(join(root, path), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: (name) => {
    if (name === 'next/server') return next;
    if (name in mocks) return mocks[name];
    throw new Error(`Unexpected dependency: ${name}`);
  }, URL, URLSearchParams, Request, Response, Headers, TextEncoder, AbortSignal, ...extras });
  return exports;
}
function routes(dir) {
  if (!existsSync(join(root, dir))) return [];
  return readdirSync(join(root, dir), { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? routes(`${dir}/${e.name}`) : e.name === 'route.ts' ? [`${dir}/${e.name}`] : []);
}
const privateRoutes = [
  ...routes('src/app/api/widgets'), ...routes('src/app/api/cards'),
].filter(path => readFileSync(join(root, path), 'utf8').includes('const userId = session.userId;'));
for (const path of privateRoutes) {
  test(`${path} ignores forged headers and queries only the validated session user`, async () => {
    let session = null;
    const calls = [];
    const db = {
      getMany: async (sql, params) => { calls.push(params); return []; },
      getOne: async (sql, params) => { calls.push(params); return null; },
      query: async (sql, params) => { calls.push(params); return { rows: [] }; },
    };
    const { GET } = load(path, {
      '@/lib/auth': { getSession: async () => session },
      '@/lib/db/client': db,
      '@/lib/db/migrate': { runMigrations: async () => {}, ensureSchema: async () => {} },
      '@/lib/tmdb/client': {}, '@/lib/weather/client': {}, '@/lib/weather/units': {},
      '@/lib/weather/codes': {}, '@/lib/translate/languages': { getLanguageName: x => x },
    }, { process: { env: {} } });
    const request = new Request('https://app.example/api?query=needle', { headers: { 'X-YouEye-User': 'victim' } });
    assert.equal((await GET(request)).status, 401);
    assert.deepEqual(calls, []);
    session = { userId: 'authenticated-user' };
    assert.equal((await GET(request)).status, 200);
    assert.ok(calls.length > 0);
    assert.ok(calls.every(params => params[0] === 'authenticated-user'));
    assert.ok(calls.every(params => !params.includes('victim')));
  });
}

test('inter-app provider refuses caller-selected identity in either JSON spelling or header', async () => {
  const path = 'src/app/api/inter-app/provide/route.ts';
  const source = readFileSync(join(root, path), 'utf8');
  let session = null;
  const calls = [];
  const getSession = async () => session;
  const query = async (sql, params) => { calls.push(params); return { rows: [] }; };
  const mocks = {
    '@/lib/auth': { getSession },
    '@/lib/db/client': { query, getMany: async (sql, params) => { calls.push(params); return []; } },
    '@/lib/db/migrate': { runMigrations: async () => {} },
    '@/lib/translate/mymemory': {}, '@/lib/weather/client': {}, '@/lib/weather/codes': {}, '@/lib/weather/units': {},
    '@/lib/wikipedia/client': {
      searchWikipedia: async (q, count, lang, userId) => { calls.push([userId]); return { results: [] }; },
    },
    '@/lib/app-config': { APP_ID: 'ye-example' },
  };
  if (source.includes('createInterAppHandler')) {
    mocks['@/lib/routes/inter-app'] = load('src/lib/routes/inter-app/index.ts', mocks);
  }
  const { POST } = load(path, mocks, {
    process: { env: {} }, fetch: async () => Response.json({ results: [] }),
  });
  const request = () => new Request('https://app.example/api/inter-app/provide', {
    method: 'POST', headers: { 'content-type': 'application/json', 'X-YouEye-User': 'victim' },
    body: JSON.stringify({ request_type: 'search', data: { query: 'needle', user_id: 'victim', userId: 'victim' } }),
  });
  assert.equal((await POST(request())).status, 401);
  assert.deepEqual(calls, []);
  session = { userId: 'authenticated-user' };
  assert.equal((await POST(request())).status, 200);
  assert.ok(calls.every(params => params[0] === 'authenticated-user'));
  if (!source.includes('createInterAppHandler') || source.includes('searchWikipedia')) assert.ok(calls.length > 0);
});

if (existsSync(join(root, 'src/lib/routes/inter-app/index.ts'))) {
  test('inter-app factory separates authenticated context from untrusted data', async () => {
    let contextSeen;
    let dataSeen;
    const { createInterAppHandler } = load('src/lib/routes/inter-app/index.ts', {
      '@/lib/auth': { getSession: async appId => { assert.equal(appId, 'ye-example'); return { userId: 'actor' }; } },
    });
    const POST = createInterAppHandler('ye-example', { search: async (data, context) => {
      dataSeen = data; contextSeen = context; return {};
    } });
    const request = type => new Request('https://app.example/api', { method: 'POST', body: JSON.stringify({
      request_type: type, data: { query: 'ok', userId: 'victim', user_id: 'victim' },
    }) });
    assert.equal((await POST(request('search'))).status, 200);
    assert.equal(contextSeen.userId, 'actor');
    assert.equal(dataSeen.query, 'ok');
    assert.equal(dataSeen.userId, undefined);
    assert.equal(dataSeen.user_id, undefined);
    assert.equal((await POST(request('toString'))).status, 400);
    assert.equal((await POST(new Request('https://app.example/api', { method: 'POST', body: 'null' }))).status, 400);
  });
}

test('middleware protects private surfaces, exact public boundaries and missing-secret state', async () => {
  const env = { JWT_SECRET: 'x'.repeat(32), IDENTITY_URL: 'https://id.example', IDENTITY_CLIENT_ID: 'client', IDENTITY_CLIENT_SECRET: 'fixture' };
  let checked = 0;
  const { createCanvasMiddleware } = load('src/lib/middleware/index.ts', {
    jose: { jwtVerify: async () => ({ payload: { userId: 'actor', identitySessionId: 'sid', iat: 100 } }) },
  }, { process: { env }, fetch: async () => { checked++; return new Response(null, { status: 204 }); } });
  const middleware = createCanvasMiddleware({ appId: 'ye-example', publicRoutes: ['/shared/'] });
  let cookie;
  const request = path => ({ nextUrl: new URL(`https://app.example${path}`), url: `https://app.example${path}`,
    headers: new Headers({ 'X-YouEye-User': 'victim' }), cookies: { get: name => name === 'ye-example-session' ? cookie : undefined } });
  for (const path of ['/api/widgets/private/data', '/api/cards/private', '/api/inter-app/provide', '/api/health-forged', '/api/auth/sso-forged']) {
    assert.equal((await middleware(request(path))).status, 401, path);
  }
  assert.equal((await middleware(request('/api/health'))).next, true);
  assert.equal((await middleware(request('/shared/token'))).next, true);
  cookie = { value: 'fixture-cookie' };
  env.JWT_SECRET = '';
  assert.equal((await middleware(request('/api/private'))).status, 503);
  env.JWT_SECRET = 'x'.repeat(32);
  assert.equal((await middleware(request('/api/private'))).next, true);
  assert.equal(checked, 1);
});


test('native backend sends the signed session issue time and denies missing or malformed times', async () => {
  let payload = { userId: 'actor', identitySessionId: 'sid', iat: 100 };
  let locallyRevoked = false;
  const calls = [];
  const { getSession } = load('src/lib/auth/session.ts', {
    'next/headers': { cookies: async () => ({ get: () => ({ value: 'signed-fixture' }) }) },
    jose: { jwtVerify: async () => ({ payload }) },
    '../db/client': { getOne: async (_sql, params) => {
      assert.deepEqual(Array.from(params), ['sid', 'actor', payload.iat]);
      return { revoked: locallyRevoked };
    } },
  }, {
    process: { env: { JWT_SECRET: 'x'.repeat(32), IDENTITY_URL: 'http://identity',
      IDENTITY_CLIENT_ID: 'client-a', IDENTITY_CLIENT_SECRET: 'fixture' } },
    fetch: async (url, options) => { calls.push(options.headers); return new Response(null, { status: 204 }); },
  });
  assert.equal((await getSession('ye-example')).userId, 'actor');
  assert.equal(calls[0]['x-youeye-session-issued-at'], '100');
  assert.equal(calls[0]['x-youeye-expected-sub'], 'actor');
  for (const iat of [undefined, 0, -1, NaN, 1.5, '100']) {
    payload = { userId: 'actor', identitySessionId: 'sid', iat };
    assert.equal(await getSession('ye-example'), null);
  }
  assert.equal(calls.length, 1);
  payload = { userId: 'actor', identitySessionId: 'sid', iat: 100 };
  locallyRevoked = true;
  assert.equal(await getSession('ye-example'), null);
  assert.equal(calls.length, 1, 'a delivered logout denies locally before calling identity');
});
