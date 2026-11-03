// Live BSV equivalents under the fixed USD/GBP prices (CEO, 3 Nov 2026). The USD/GBP figure is the price; BSV is
// just a way to pay it, at 10% off. Same rate feed as bWalletX (CoinGecko bitcoin-cash-sv/usd). Shown to 2 dp as
// approximate; b confirms the exact BSV amount before you pay (15-minute lock: add to the page once live).
(function () {
  var els = [].slice.call(document.querySelectorAll('.bsv[data-usd]'));
  if (!els.length) return;
  var KEY = 'badx-bsv-usd', TTL = 5 * 60 * 1000, OFF = 0.10;
  function show(rate) {
    if (!(rate > 0)) return;
    els.forEach(function (el) {
      var bsv = (+el.getAttribute('data-usd')) * (1 - OFF) / rate;
      el.textContent = 'Pay in BSV: 10% off, ≈ ' + bsv.toFixed(2) + ' BSV today';
      el.hidden = false;
    });
  }
  try {
    var c = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    if (c && Date.now() - c.t < TTL) return show(c.r);
  } catch (e) {}
  fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin-cash-sv&vs_currencies=usd')
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      var r = d && d['bitcoin-cash-sv'] && d['bitcoin-cash-sv'].usd;
      if (!(r > 0)) return;
      try { sessionStorage.setItem(KEY, JSON.stringify({ r: r, t: Date.now() })); } catch (e) {}
      show(r);
    })
    .catch(function () {});
})();
