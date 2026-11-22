/* Sign in with bWalletX on the same phone (@bwalletx/connect 0.9.0). Load straight after
   /connect/bwalletx-connect.global.js, before any other script, on every page that signs in and on the root page.

   - bwxPhone.returned: bWalletX sends the user back to this origin's ROOT with a #bwx=… fragment (connect strips it
     from the address bar the moment it loads). On that page this finishes the pairing, posts the sign-in bWalletX
     folded into Connect to data-verify (this site's own verify route), then goes back to the page the sign-in
     started on. Resolves the resumed pairing ({ wallet, login, page, verified }), or null.
   - bwxPhone.signIn(opts): signInWithBwalletX, except that when no wallet is in this browser the challenge is fetched
     first and folded into the pairing link, so bWalletX asks once ("Connect and sign in") and returns the user here,
     instead of a second trip to the wallet for the signature.
   - bwxPhone.anotherTab(e): true when the sign-in finished in the tab bWalletX opened (re-read your session). */
(() => {
  const C = window.bWalletXConnect;
  if (!C) return;
  const verifyUrl = (document.currentScript && document.currentScript.dataset.verify) || '';

  const returned = (async () => {
    if (!C.hasReturnFragment || !C.hasReturnFragment()) return null;
    const r = await C.resumeReturnedPairing().catch(() => null);
    if (!r) return null;
    r.verified = false;
    if (r.login && verifyUrl) {
      try {
        const res = await fetch(verifyUrl, {
          method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ identityKey: r.login.identityKey, nonce: r.login.nonce, signature: r.login.signature }),
        });
        r.verified = res.ok;
      } catch { /* offline: the page shows signed out and the button works as usual */ }
    }
    if (r.page && r.page !== location.origin + location.pathname) location.replace(r.page);
    return r;
  })();

  async function signIn({ challenge, pairing, onStatus }) {
    const found = await C.discoverBwalletX(C.DEFAULT_DISCOVER_MS || 300);
    if (found) return C.signInWithBwalletX({ wallet: found.wallet, challenge, onStatus });
    // No wallet in this browser: a stored pairing or a new one (QR on a computer, "Open bWalletX" on a phone).
    const pre = await challenge();
    const login = C.foldableLogin(pre, location.origin);
    const { wallet, method } = await C.connectBwalletX({ pairing: login ? { ...pairing, login } : pairing, discoverMs: 0, onStatus });
    // The challenge bWalletX signed with Connect, or one still fresh enough to sign now; otherwise ask for a new one.
    let first = wallet.signedIn || (pre && pre.expiresAt && pre.expiresAt - Date.now() > 30e3) ? pre : null;
    return C.signInWithBwalletX({
      wallet, onStatus, skipWaitForAuthentication: method === 'pairing',
      challenge: (k) => { const c = first; first = null; return c ? Promise.resolve(c) : challenge(k); },
    });
  }

  const anotherTab = (e) => !!e && e.code === 'RETURNED_IN_ANOTHER_TAB';

  window.bwxPhone = { returned, signIn, anotherTab };
})();
