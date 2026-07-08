/**
 * Show Your Citations — Scholar proxy service (portable, zero-dependency).
 *
 * A tiny HTTP service that fetches a Google Scholar profile server-side and
 * returns clean JSON. Run it on any always-on host whose IP Google Scholar does
 * NOT block (most VPS IPs work; Cloudflare Workers' shared edge IPs do NOT — that
 * is why this is a plain server, not a Worker). Optionally front it with
 * Cloudflare (proxied DNS or a Tunnel) for edge caching + mainland-China reach.
 *
 *   node server.js                 # listens on :8080
 *   PORT=9000 node server.js       # custom port
 *
 * Endpoint:  GET /?user=<scholarId>[&hl=en]   ->  citation JSON
 *            GET /health                        ->  { ok: true }
 */

import http from 'node:http';

const PORT = parseInt(process.env.PORT || '8080', 10);
const CACHE_TTL_MS = parseInt(process.env.CACHE_TTL_MS || String(60 * 60 * 1000), 10);
const SCHOLAR_BASE = 'https://scholar.google.com/citations';
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const cache = new Map(); // user -> { at, data }

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'OPTIONS') return send(res, 204, null);
  if (url.pathname === '/health') return send(res, 200, { ok: true });
  if (req.method !== 'GET') return send(res, 405, { error: 'method_not_allowed' });

  const user = (url.searchParams.get('user') || '').trim();
  const hl = (url.searchParams.get('hl') || 'en').trim();

  if (!user) return send(res, 400, { error: 'missing_user', hint: 'Call with ?user=<scholarId>' });
  if (!/^[A-Za-z0-9_-]{5,30}$/.test(user)) {
    return send(res, 400, { error: 'invalid_user', hint: 'Malformed Scholar id' });
  }

  const hit = cache.get(user);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return send(res, 200, hit.data, { 'X-Cache': 'HIT' });
  }

  try {
    const data = await fetchScholar(user, hl);
    if (data.blocked) {
      return send(res, 429, {
        error: 'scholar_blocked',
        hint: "Google Scholar rate-limited this server's IP. Try again shortly.",
      });
    }
    if (data.citations.all === 0 && data.h_index.all === 0 && !data.name) {
      return send(res, 404, {
        error: 'not_found',
        hint: 'No stats parsed — check the Scholar id is correct and public.',
      });
    }
    cache.set(user, { at: Date.now(), data });
    send(res, 200, data, {
      'Cache-Control': `public, max-age=${Math.floor(CACHE_TTL_MS / 1000)}`,
      'X-Cache': 'MISS',
    });
  } catch (err) {
    send(res, 502, { error: 'upstream_failed', detail: String(err && err.message || err) });
  }
});

/** Fetch and parse a Scholar profile into normalized stats. */
async function fetchScholar(user, hl) {
  const target = `${SCHOLAR_BASE}?user=${encodeURIComponent(user)}&hl=${encodeURIComponent(hl)}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  let html;
  try {
    const r = await fetch(target, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': BROWSER_UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    if (!r.ok) throw new Error(`scholar HTTP ${r.status}`);
    html = await r.text();
  } finally {
    clearTimeout(timer);
  }

  if (/id="gs_captcha|not a robot|unusual traffic/i.test(html)) return { blocked: true };

  const num = (s) => parseInt(String(s || '').replace(/[^\d]/g, '') || '0', 10);
  const stats = [...html.matchAll(/<td class="gsc_rsb_std">([^<]*)<\/td>/g)].map((m) => m[1]);
  const name = (html.match(/<div id="gsc_prf_in"[^>]*>([^<]+)<\/div>/) || [])[1] || '';
  const sinceYear = num((html.match(/Since (\d{4})/) || [])[1]) || null;

  // stats order: [citations all, since, h all, since, i10 all, since]
  return {
    name: name.trim(),
    since_year: sinceYear,
    citations: { all: num(stats[0]), since: num(stats[1]) },
    h_index: { all: num(stats[2]), since: num(stats[3]) },
    i10_index: { all: num(stats[4]), since: num(stats[5]) },
    updated_at: Date.now(),
  };
}

function send(res, status, body, extra = {}) {
  const headers = { ...CORS, ...extra };
  if (body === null) {
    res.writeHead(status, headers);
    return res.end();
  }
  const json = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
  res.end(json);
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`scholar-proxy listening on :${PORT}`);
});
