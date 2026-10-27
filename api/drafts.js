// bAds storefront: one AI ad still per call (the page asks three times in parallel).
// Replicate (env REPLICATE_API_TOKEN, model REPLICATE_IMAGE_MODEL, default flux-schnell); Gemini (GEMINI_API_KEY) if set instead. Returns the raw image; the page sizes it to 1080x1080 and ≤400 KB,
// lays the headline and logo on top, and records the 6 s loop in the browser. No money here.
const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const ORIGIN = process.env.APP_ORIGIN || 'https://badvertisingx.com';
const MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';
const REPLICATE_MODEL = process.env.REPLICATE_IMAGE_MODEL || 'black-forest-labs/flux-schnell';
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const PRODUCTS = ['square7', 'square30', 'takeover24', 'cpm'];
const RATINGS = { pg: 'family friendly, suitable for all ages', '17': 'suitable for teens and adults, no nudity', '18': 'adult audience allowed, but no nudity or explicit content' };
const LOOKS = [
  'bold product hero shot, studio lighting, rich contrast',
  'lifestyle scene showing a person enjoying the product, warm natural light',
  'graphic poster style, strong shapes and colour blocks, modern and clean',
];

// Per-IP limit: 12 drafts per 10 minutes, per warm instance (best effort; no database needed).
const hits = new Map();
function limited(ip) {
  const now = Date.now(), win = 10 * 60e3, list = (hits.get(ip) || []).filter((t) => now - t < win);
  if (list.length >= 12) { hits.set(ip, list); return true; }
  list.push(now); hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return false;
}

export async function POST(req) {
  const origin = req.headers.get('origin');
  if (origin !== ORIGIN && !(process.env.VERCEL_ENV !== 'production' && origin && /^http:\/\/localhost(:\d+)?$/.test(origin))) return json({ error: 'origin not allowed' }, 403);
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  if (limited(ip)) return json({ error: 'Too many drafts. Try again in a few minutes.' }, 429);
  const rkey = process.env.REPLICATE_API_TOKEN, key = process.env.GEMINI_API_KEY;
  if (!rkey && !key) return json({ error: 'Drafts are not switched on yet.' }, 503);

  const b = await req.json().catch(() => ({}));
  const product = PRODUCTS.includes(b.product) ? b.product : 'square7';
  const rating = RATINGS[b.rating] ? b.rating : 'pg';
  const headline = str(b.headline, 80), sell = str(b.sell, 600), note = str(b.note, 300);
  const colour = /^#[0-9a-f]{6}$/i.test(b.colour || '') ? b.colour : '';
  const slot = Math.max(0, Math.min(2, b.slot | 0));
  if (!headline || !sell) return json({ error: 'headline and what you sell are required' }, 400);
  let logo = null;
  if (typeof b.logo === 'string') {
    const m = b.logo.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
    if (m && m[2].length < 400_000) logo = { mime: m[1], data: m[2] };
  }

  const prompt = [
    `Square 1:1 advertising image for a ${product === 'takeover24' ? 'full-page takeover' : 'square banner'} ad.`,
    `The advertiser sells: ${sell}.`,
    `The ad's headline (added later by us, do NOT draw it) is: "${headline}".`,
    `Look: ${LOOKS[slot]}.`,
    colour ? `Use the brand colour ${colour} prominently.` : '',
    logo ? 'The attached image is the brand logo: take its colours and feel, but do not draw the logo itself.' : '',
    `Audience: ${RATINGS[rating]}.`,
    note ? `Revision note from the advertiser: ${note}.` : '',
    'Keep the top third calm and uncluttered so a headline can sit there. No text, no letters, no words, no watermarks, no real brand logos.',
  ].filter(Boolean).join(' ');

  if (rkey) return replicate(rkey, prompt);

  const parts = [{ text: prompt }];
  if (logo) parts.push({ inline_data: { mime_type: logo.mime, data: logo.data } });
  let res;
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '1:1' } } }),
    });
  } catch { return json({ error: 'The image service did not answer. Try again.' }, 502); }
  const data = await res.json().catch(() => ({}));
  const img = data?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData || p.inline_data);
  const inline = img && (img.inlineData || img.inline_data);
  if (!res.ok || !inline) return json({ error: res.status === 429 ? 'The image service is busy. Try again shortly.' : 'No image came back. Try different words.' }, 502);
  return json({ image: `data:${inline.mimeType || inline.mime_type || 'image/png'};base64,${inline.data}` });
}

// Replicate: text only (the logo isn't sent; its colours come through the brand colour field).
async function replicate(token, prompt) {
  let res;
  try {
    res = await fetch(`https://api.replicate.com/v1/models/${REPLICATE_MODEL}/predictions`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', prefer: 'wait=50' },
      body: JSON.stringify({ input: { prompt, aspect_ratio: '1:1', output_format: 'webp', num_outputs: 1 } }),
    });
  } catch { return json({ error: 'The image service did not answer. Try again.' }, 502); }
  let data = await res.json().catch(() => ({}));
  // "Prefer: wait" can still hand back a running prediction: poll it for up to ~45 s.
  for (let i = 0; res.ok && data.urls?.get && !['succeeded', 'failed', 'canceled'].includes(data.status) && i < 45; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    data = await fetch(data.urls.get, { headers: { authorization: `Bearer ${token}` } }).then((r) => r.json()).catch(() => data);
  }
  const url = Array.isArray(data.output) ? data.output[0] : data.output;
  if (!res.ok || typeof url !== 'string') return json({ error: res.status === 429 ? 'The image service is busy. Try again shortly.' : 'No image came back. Try different words.' }, 502);
  const img = await fetch(url).catch(() => null);
  if (!img || !img.ok) return json({ error: 'No image came back. Try again.' }, 502);
  const buf = Buffer.from(await img.arrayBuffer());
  return json({ image: `data:${img.headers.get('content-type') || 'image/webp'};base64,${buf.toString('base64')}` });
}
