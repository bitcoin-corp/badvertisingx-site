// DM the owner in bChatX as $bwalletx when a brief arrives (bit-sign POST /api/bitsign/bwalletx/dm).
// Signed like lib/b-agent-rules.ts bSign: header x-b-signature "t=<unix>,v1=<hmac-sha256 hex of `${t}.${body}`>".
import { createHmac } from 'node:crypto';

const DM_URL = 'https://www.bchatx.com/api/bitsign/bwalletx/dm';

export async function notifyOwner(text, ref) {
  const secret = process.env.BWALLETX_AGENT_SECRET;
  if (!secret) return; // not configured: briefs still save
  const body = JSON.stringify({ to: 'boase', text, ref });
  const t = Math.floor(Date.now() / 1000);
  const v1 = createHmac('sha256', secret).update(`${t}.${body}`).digest('hex');
  try {
    const res = await fetch(DM_URL, { method: 'POST', headers: { 'content-type': 'application/json', 'x-b-signature': `t=${t},v1=${v1}` }, body, signal: AbortSignal.timeout(5000) });
    if (!res.ok) console.error('[notify] dm', res.status);
  } catch (e) {
    console.error('[notify] dm failed', e.message);
  }
}
