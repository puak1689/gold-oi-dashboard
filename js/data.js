/* ============================================================
   data.js — fetch + parse Vol2Vol data
   Source: github.com/pageth/Vol2VolData  (raw text files)

   File format (both OIData.txt and IntradayData.txt):
     line 0: Gold (OG|GC) G2TM6 (0.17 DTE) vs 4364.2 (+0.8) - Open Interest
     line 1: Put: 1,920  Call: 2,105  Vol: 28.55  Vol Chg: -0.53  Future Chg: 0.8
     line 2: Strike,Call,Put,Vol Settle
     line 3+: 4285,0,13,0.3558...
   ============================================================ */

const DATA_SOURCE = {
  oi:       'https://raw.githubusercontent.com/pageth/Vol2VolData/main/OIData.txt',
  intraday: 'https://raw.githubusercontent.com/pageth/Vol2VolData/main/IntradayData.txt',
};
// our own mirror (same-origin on GitHub Pages) — fallback if pageth is unreachable/deleted
const DATA_FALLBACK = {
  oi:       'data/mirror/OIData.txt',
  intraday: 'data/mirror/IntradayData.txt',
};

async function fetchOne(url) {
  const res = await fetch(url + (url.includes('?') ? '&' : '?') + 't=' + Date.now(), { cache: 'no-store' });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const txt = await res.text();
  if (!txt.trim()) throw new Error('empty');
  return txt;
}

// fetch raw text; try pageth first, fall back to our mirror. Returns { text, fb }.
async function fetchText(primary, fallback) {
  try { return { text: await fetchOne(primary), fb: false }; }
  catch (e) {
    if (fallback) return { text: await fetchOne(fallback), fb: true };   // throws if mirror also dead
    throw e;
  }
}

function parseVol2Vol(text) {
  const lines = text.replace(/\r/g, '').split('\n');
  const head = lines[0] || '';
  const sum  = lines[1] || '';

  const grab = (re, src, dflt = 0) => {
    const m = src.match(re);
    return m ? parseFloat(m[1].replace(/,/g, '')) : dflt;
  };

  const fxMatch = head.match(/vs\s+([\d.]+)\s+\(([+-]?[\d.]+)\)/);

  const meta = {
    contract:  (head.match(/Gold\s*\(OG\|GC\)\s*(\S+)/) || [, ''])[1],
    dte:       grab(/\(([\d.]+)\s*DTE\)/, head),
    future:    fxMatch ? parseFloat(fxMatch[1]) : 0,
    futureChg: fxMatch ? parseFloat(fxMatch[2]) : 0,
    kind:      (head.split(' - ')[1] || '').trim(),
    totalPut:  grab(/Put:\s*([\d,]+)/, sum),
    totalCall: grab(/Call:\s*([\d,]+)/, sum),
    iv:        grab(/Vol:\s*([\d.]+)/, sum),
    ivChg:     grab(/Vol Chg:\s*([+-]?[\d.]+)/, sum),
  };

  const rows = [];
  for (let i = 3; i < lines.length; i++) {
    const p = lines[i].split(',');
    if (p.length < 4) continue;
    const strike = parseFloat(p[0]);
    if (!strike) continue;
    rows.push({
      strike,
      call: parseInt(p[1], 10) || 0,
      put:  parseInt(p[2], 10) || 0,
      iv:   parseFloat(p[3]) || 0,   // per-strike "Vol Settle" (implied vol, decimal)
    });
  }

  meta.rows = rows;
  return meta;
}

// 1 standard deviation in price points:  σ = future × (IV%/100) × √(DTE/365)
function sigmaOf(d) {
  if (!d || !d.future || !d.iv || !d.dte) return 0;
  return d.future * (d.iv / 100) * Math.sqrt(d.dte / 365);
}

// normal distribution height at x (for the bell curve)
function normalPDF(x, mu, s) {
  if (!s) return 0;
  const z = (x - mu) / s;
  return Math.exp(-0.5 * z * z) / (s * Math.sqrt(2 * Math.PI));
}

// open-interest-weighted mean strike = "centre of gravity" of all the OI/volume
function oiWeightedMean(rows) {
  let wsum = 0, w = 0;
  for (const r of rows) {
    const v = r.call + r.put;
    wsum += r.strike * v; w += v;
  }
  return w ? wsum / w : 0;
}

// merge OI + Intraday by strike → { strike, oiCall, oiPut, inCall, inPut }
function mergeBoth(oiRows, inRows) {
  const map = new Map();
  const ensure = (s) => map.get(s) || (map.set(s, { strike: s, oiCall: 0, oiPut: 0, inCall: 0, inPut: 0 }), map.get(s));
  for (const r of oiRows) { const o = ensure(r.strike); o.oiCall = r.call; o.oiPut = r.put; }
  for (const r of inRows) { const o = ensure(r.strike); o.inCall = r.call; o.inPut = r.put; }
  return [...map.values()].sort((a, b) => a.strike - b.strike);
}
