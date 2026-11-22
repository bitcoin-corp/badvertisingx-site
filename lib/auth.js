import { createBwalletXAuth } from '@bwalletx/connect/next';
import { readCookie, serializeCookie } from '@bwalletx/connect/server';
import { nonceStore } from './db.js';

const origin = process.env.APP_ORIGIN || 'https://badvertisingx.com';
// __Host-: Secure, Path=/, no Domain, so no subdomain or plain-http page can set or shadow it.
export const COOKIE = '__Host-bwx_session';
const OLD_COOKIE = 'bwx_session';

const base = createBwalletXAuth({ origin, store: nonceStore, cookieName: COOKIE });
// The cookie name before 22 Nov 2026: read once, then moved to COOKIE (same signed token, same expiry).
const legacy = createBwalletXAuth({ origin, store: nonceStore, cookieName: OLD_COOKIE });
const clearOld = () => serializeCookie('', { name: OLD_COOKIE, maxAge: 0, secure: origin.startsWith('https:') });

export const auth = {
  ...base,
  async getSession(req) {
    return (await base.getSession(req)) ?? (await legacy.getSession(req));
  },
  async session(req) {
    const res = await base.session(req);
    if (readCookie(req.headers.get('cookie'), COOKIE)) return res;
    const s = await legacy.getSession(req);
    if (!s) return res;
    // Reissue the old cookie's token under the new name for the time it has left, and clear the old one.
    const out = Response.json({ identityKey: s.sub, uid: s.uid, handle: s.handle, paymail: s.paymail, exp: s.exp }, { headers: { 'cache-control': 'no-store' } });
    const token = readCookie(req.headers.get('cookie'), OLD_COOKIE);
    out.headers.append('set-cookie', serializeCookie(token, { name: COOKIE, maxAge: Math.max(0, s.exp - Math.floor(Date.now() / 1000)), secure: origin.startsWith('https:') }));
    out.headers.append('set-cookie', clearOld());
    return out;
  },
  async logout(req) {
    const res = await base.logout(req);
    if (res.ok) res.headers.append('set-cookie', clearOld());
    return res;
  },
};
