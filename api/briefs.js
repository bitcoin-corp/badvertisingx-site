import { auth } from '../lib/auth.js';
import { rest } from '../lib/db.js';
import { notifyOwner } from '../lib/notify.js';

const JOBS = ['share-image', 'logo', 'brand-kit', 'ad-film', 'launch-pack', 'other'];
const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const ORIGIN = process.env.APP_ORIGIN || 'https://badvertisingx.com';
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export async function GET(req) {
  const s = await auth.getSession(req);
  if (!s) return json({ error: 'sign in first' }, 401);
  const rows = await rest(`badx_briefs?identity_key=eq.${encodeURIComponent(s.sub)}&select=id,job,brand,status,created_at&order=created_at.desc&limit=50`);
  return json({ briefs: rows });
}

export async function POST(req) {
  if (req.headers.get('origin') !== ORIGIN) return json({ error: 'origin not allowed' }, 403);
  const s = await auth.getSession(req);
  if (!s) return json({ error: 'sign in first' }, 401);
  const b = await req.json().catch(() => ({}));
  const job = JOBS.includes(b.job) ? b.job : null;
  const brand = str(b.brand, 120), brief = str(b.brief, 4000), link = str(b.link, 500), contact = str(b.contact, 200);
  if (!job || !brand || !brief) return json({ error: 'job, brand and brief are required' }, 400);
  const recent = await rest(`badx_briefs?identity_key=eq.${encodeURIComponent(s.sub)}&created_at=gt.${new Date(Date.now() - 864e5).toISOString()}&select=id`);
  if (recent.length >= 10) return json({ error: 'too many briefs today' }, 429);
  const [row] = await rest('badx_briefs', { method: 'POST', body: { identity_key: s.sub, job, brand, brief, link: link || null, contact: contact || null }, prefer: 'return=representation' });
  const who = s.handle ? `$${s.handle}` : `${s.sub.slice(0, 8)}…${s.sub.slice(-4)}`;
  await notifyOwner(`New bAdvertisingX brief from ${who}\n${job} · ${brand}\n\n${brief.slice(0, 600)}${link ? `\n\n${link}` : ''}${contact ? `\nContact: ${contact}` : ''}\n\nid ${row.id}`, `badx:${row.id}`);
  return json({ id: row.id, status: row.status }, 201);
}
