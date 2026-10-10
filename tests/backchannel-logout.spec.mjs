import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as jose from 'jose';

const issuer = 'https://id.example.test';
const clientId = 'notes-client';
const event = 'http://schemas.openid.net/event/backchannel-logout';
const { privateKey, publicKey } = await jose.generateKeyPair('RS256');
const now = Math.floor(Date.now() / 1000);
const ledger = new Map();
const queries = [];
const exports = {};
const code = ts.transpileModule(readFileSync(
  new URL('../src/app/api/auth/backchannel-logout/route.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(code, {
  exports, URL, URLSearchParams, Response, AbortSignal, Date,
  process: { env: { IDENTITY_URL: issuer, IDENTITY_CLIENT_ID: clientId } },
  fetch: async () => Response.json({ issuer, jwks_uri: `${issuer}/jwks` }),
  require: name => {
    if (name === 'jose') return { ...jose, createRemoteJWKSet: () => async () => publicKey };
    if (name === '@/lib/db/client') return { query: async (sql, params) => {
      queries.push(sql);
      if (sql.startsWith('INSERT')) {
        const [issuer, jti, session_id, subject, issued_at] = params;
        const key = `${issuer}:${jti}`;
        if (ledger.has(key)) return { rowCount: 0 };
        ledger.set(key, { session_id, subject, issued_at: String(issued_at) });
        return { rowCount: 1 };
      }
      if (sql.startsWith('SELECT')) return { rows: [ledger.get(`${params[0]}:${params[1]}`)] };
      return { rows: [] };
    } };
    throw new Error(`Unexpected dependency ${name}`);
  },
});
async function signed(patch = {}, header = {}, key = privateKey) {
  return new jose.SignJWT({
    iss: issuer, aud: clientId, sub: 'actor', sid: 'sid', jti: 'event-1',
    iat: now - 100, exp: now + 300, events: { [event]: {} }, ...patch,
  }).setProtectedHeader({ alg: 'RS256', typ: 'logout+jwt', ...header }).sign(key);
}
async function post(token, contentType = 'application/x-www-form-urlencoded') {
  return exports.POST(new Request('https://notes.example.test/api/auth/backchannel-logout', {
    method: 'POST', headers: { 'content-type': contentType },
    body: new URLSearchParams({ logout_token: token }).toString(),
  }));
}

test('signed logout persists the revocation time and acknowledges only identical retries', async () => {
  const token = await signed();
  assert.equal((await post(token)).status, 204);
  assert.equal(ledger.get(`${issuer}:event-1`).issued_at, String(now - 100),
    'a delayed event retains signed time instead of notification receipt time');
  assert.equal((await post(token)).status, 204);
  assert.equal(ledger.size, 1);
  for (const changed of [{ sid: 'other' }, { sub: 'other' }, { iat: now - 99 }]) {
    assert.equal((await post(await signed(changed))).status, 400);
  }
  assert.equal((await post(await signed({ jti: 'event-2', iat: now - 10 }))).status, 204);
  assert.equal(ledger.size, 2, 'a later revocation of the same SID is a separate event');
});

test('logout rejects wrong signature, issuer, audience, type and malformed event claims before writes', async () => {
  const other = await jose.generateKeyPair('RS256');
  const invalid = [
    [{ iss: 'https://foreign.example.test' }], [{ aud: 'other-app' }],
    [{ nonce: 'not-allowed' }], [{ events: {} }],
    [{ events: { [event]: { unexpected: true } } }], [{ events: { [event]: [] } }],
    [{ events: { [event]: {}, other: {} } }], [{ sid: '' }], [{ sub: '' }], [{ jti: '' }],
    [{ iat: now + 60 }], [{ iat: 0 }], [{ iat: now - 100.5 }], [{ exp: now - 200 }],
    [{}, { typ: 'JWT' }], [{}, {}, other.privateKey],
  ];
  const count = queries.length;
  for (const args of invalid) assert.equal((await post(await signed(...args))).status, 400);
  assert.equal(queries.length, count, 'untrusted logout cannot mutate the ledger');
  assert.equal((await post(await signed(), 'application/json')).status, 415);
});

test('local session enforcement denies old cookies, allows a new authorization and survives another revocation', async () => {
  let payload = { userId: 'actor', identitySessionId: 'sid', iat: now - 110 };
  let checks = 0;
  const sessionExports = {};
  const source = ts.transpileModule(readFileSync(new URL('../src/lib/auth/session.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, {
    exports: sessionExports, TextEncoder, AbortSignal,
    process: { env: { JWT_SECRET: 'x'.repeat(32), IDENTITY_URL: issuer,
      IDENTITY_CLIENT_ID: clientId, IDENTITY_CLIENT_SECRET: 'fixture' } },
    fetch: async () => { checks++; return new Response(null, { status: 204 }); },
    require: name => {
      if (name === 'next/headers') return { cookies: async () => ({ get: () => ({ value: 'fixture' }) }) };
      if (name === 'jose') return { jwtVerify: async () => ({ payload }) };
      if (name === '../db/client') return { getOne: async (sql, [sid, sub, issuedAt]) => {
        assert.match(sql, /issued_at.*>= \$3/);
        return { revoked: [...ledger.values()].some(e => e.session_id === sid
          && e.subject === sub && (e.issued_at === null || Number(e.issued_at) >= issuedAt)) };
      } };
      throw new Error(`Unexpected dependency ${name}`);
    },
  });
  assert.equal(await sessionExports.getSession('notes'), null);
  assert.equal(checks, 0);
  payload.iat = now;
  assert.equal((await sessionExports.getSession('notes')).userId, 'actor');
  assert.equal(checks, 1, 'fresh authorization still checks current CP admission');
  assert.equal((await post(await signed({ jti: 'event-3', iat: now }))).status, 204);
  assert.equal(await sessionExports.getSession('notes'), null);
  assert.equal(checks, 1, 'a later delivered revocation denies the new cookie locally');
  payload = { ...payload, userId: 'other-actor' };
  assert.equal((await sessionExports.getSession('notes')).userId, 'other-actor');
  ledger.set('legacy', { session_id: 'sid', subject: 'other-actor', issued_at: null });
  assert.equal(await sessionExports.getSession('notes'), null, 'legacy events without a signed time stay closed');
});
