// Supabase REST (self-hosted on Hetzner), server only. Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
const base = () => {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('database not configured');
  return { url: url.replace(/\/$/, '') + '/rest/v1', key };
};

export async function rest(path, { method = 'GET', body, prefer } = {}) {
  const { url, key } = base();
  const res = await fetch(`${url}/${path}`, {
    method,
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      'content-type': 'application/json',
      ...(prefer ? { prefer } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`db ${res.status}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// NonceStore for @bwalletx/connect: one-time challenges, taken (deleted) on use.
export const nonceStore = {
  async put(nonce, c) {
    await rest('badx_nonces', { method: 'POST', body: { nonce, data: c, expires_at: new Date(c.expiresAt).toISOString() }, prefer: 'return=minimal' });
  },
  async take(nonce) {
    const rows = await rest(`badx_nonces?nonce=eq.${encodeURIComponent(nonce)}`, { method: 'DELETE', prefer: 'return=representation' });
    const row = rows?.[0];
    if (!row || Date.parse(row.expires_at) < Date.now()) return null;
    return row.data;
  },
};
