import { createRemoteJWKSet, decodeProtectedHeader, jwtVerify } from 'jose';
import { query } from '@/lib/db/client';

export const runtime = 'nodejs';

const EVENT = 'http://schemas.openid.net/event/backchannel-logout';

export async function POST(request: Request) {
  const clientId = process.env.IDENTITY_CLIENT_ID;
  const identityBase = process.env.IDENTITY_INTERNAL_URL || process.env.IDENTITY_URL;
  if (!clientId || !identityBase) return new Response(null, { status: 503 });
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/x-www-form-urlencoded')) {
    return new Response(null, { status: 415 });
  }
  const body = await request.text();
  if (body.length > 16_384) return new Response(null, { status: 413 });
  const logoutToken = new URLSearchParams(body).get('logout_token');
  if (!logoutToken) return new Response(null, { status: 400 });
  try {
    const discoveryUrl = `${identityBase.replace(/\/$/, '')}/application/o/${encodeURIComponent(clientId)}/.well-known/openid-configuration`;
    const discoveryResponse = await fetch(discoveryUrl, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
    if (!discoveryResponse.ok) throw new Error('Discovery unavailable');
    const discovery = await discoveryResponse.json() as { issuer?: string; jwks_uri?: string };
    if (!discovery.issuer || !discovery.jwks_uri) throw new Error('Incomplete discovery');
    const header = decodeProtectedHeader(logoutToken);
    if (header.alg !== 'RS256' || header.typ !== 'logout+jwt') throw new Error('Invalid logout header');
    const jwks = createRemoteJWKSet(new URL(discovery.jwks_uri));
    const { payload } = await jwtVerify(logoutToken, jwks, {
      issuer: discovery.issuer,
      audience: clientId,
      algorithms: ['RS256'],
      maxTokenAge: '24h',
    });
    if (typeof payload.jti !== 'string' || !payload.jti || !Number.isSafeInteger(payload.iat)
      || Number(payload.iat) <= 0 || Number(payload.iat) > Math.floor(Date.now() / 1000) + 30
      || !Number.isSafeInteger(payload.exp) || Number(payload.exp) <= Number(payload.iat)
      || typeof payload.sub !== 'string' || !payload.sub || !payload.sid
      || typeof payload.sid !== 'string' || payload.nonce !== undefined
      || !payload.events || typeof payload.events !== 'object'
      || Object.keys(payload.events).length !== 1
      || !Object.hasOwn(payload.events, EVENT)
      || !(payload.events as Record<string, unknown>)[EVENT]
      || typeof (payload.events as Record<string, unknown>)[EVENT] !== 'object'
      || Array.isArray((payload.events as Record<string, unknown>)[EVENT])
      || Object.keys((payload.events as Record<string, unknown>)[EVENT] as object).length !== 0) {
      throw new Error('Invalid logout claims');
    }
    await query(`CREATE TABLE IF NOT EXISTS oidc_logout_events (
      issuer text NOT NULL, jti text NOT NULL, session_id text NOT NULL,
      subject text NOT NULL, issued_at bigint, received_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (issuer, jti))`);
    // Older events have no signed cutoff and continue to deny that session
    // conservatively. New events use signed issue time, never receipt time.
    await query('ALTER TABLE oidc_logout_events ADD COLUMN IF NOT EXISTS issued_at bigint');
    const inserted = await query<{ jti: string }>(
      `INSERT INTO oidc_logout_events(issuer, jti, session_id, subject, issued_at)
       VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING RETURNING jti`,
      [discovery.issuer, payload.jti, payload.sid, payload.sub, payload.iat],
    );
    // An identical retry may follow a lost HTTP response. The event was already
    // applied, so acknowledge it without applying a second state transition.
    if (inserted.rowCount === 0) {
      const prior = await query<{ session_id: string; subject: string; issued_at: string | null }>(
        'SELECT session_id, subject, issued_at FROM oidc_logout_events WHERE issuer = $1 AND jti = $2',
        [discovery.issuer, payload.jti],
      );
      if (prior.rows[0]?.session_id !== payload.sid || prior.rows[0]?.subject !== payload.sub
        || (prior.rows[0]?.issued_at !== null && Number(prior.rows[0]?.issued_at) !== payload.iat)) {
        throw new Error('Conflicting logout replay');
      }
      return new Response(null, { status: 204 });
    }
    return new Response(null, { status: 204 });
  } catch {
    return new Response(null, { status: 400 });
  }
}
