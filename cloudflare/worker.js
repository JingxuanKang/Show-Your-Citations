/**
 * Show Your Citations — Cloudflare Worker proxy
 *
 * Fetches a Google Scholar profile server-side (at Cloudflare's edge, outside
 * the GFW), parses the citation stats with HTMLRewriter, and returns clean
 * JSON with permissive CORS headers.
 *
 * Why this exists:
 *   - Mainland China cannot reach scholar.google.com directly; the edge can.
 *   - Google Scholar blocks naive client-side fetches (CAPTCHA / 429).
 *   - Parsing lives in one place, so a Scholar markup change is a one-file fix.
 *
 * Endpoint:  GET /?user=<scholarId>[&hl=en]
 * Response:  { name, since_year, citations:{all,since}, h_index:{...}, i10_index:{...}, updated_at }
 */

const SCHOLAR_BASE = 'https://scholar.google.com/citations';
const EDGE_CACHE_SECONDS = 3600; // 1h edge cache per profile
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    if (request.method !== 'GET') {
      return json({ error: 'method_not_allowed' }, 405);
    }

    const url = new URL(request.url);
    const user = (url.searchParams.get('user') || '').trim();
    const hl = (url.searchParams.get('hl') || 'en').trim();

    if (!user) {
      return json(
        { error: 'missing_user', hint: 'Call with ?user=<scholarId>' },
        400,
      );
    }
    // Scholar user ids are short alphanumeric tokens; reject anything weird.
    if (!/^[A-Za-z0-9_-]{5,30}$/.test(user)) {
      return json({ error: 'invalid_user', hint: 'Malformed Scholar id' }, 400);
    }

    // Serve from the edge cache when we can.
    const cache = caches.default;
    const cacheKey = new Request(`${url.origin}/?user=${user}&hl=${hl}`, {
      method: 'GET',
    });
    const cached = await cache.match(cacheKey);
    if (cached) return withCors(cached);

    let data;
    try {
      data = await fetchScholar(user, hl);
    } catch (err) {
      return json(
        { error: 'upstream_failed', detail: String(err && err.message || err) },
        502,
      );
    }

    if (data.blocked) {
      // Scholar served a CAPTCHA / robot check to the edge IP.
      return json(
        {
          error: 'scholar_blocked',
          hint: 'Google Scholar rate-limited the proxy. Try again shortly.',
        },
        429,
      );
    }
    if (data.citations.all === 0 && data.h_index.all === 0 && !data.name) {
      return json(
        {
          error: 'not_found',
          hint: 'No stats parsed — check the Scholar id is correct and public.',
        },
        404,
      );
    }

    const response = json(data, 200, {
      'Cache-Control': `public, max-age=${EDGE_CACHE_SECONDS}`,
    });
    ctx.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  },
};

/** Fetch and parse a Scholar profile into normalized stats. */
async function fetchScholar(user, hl) {
  const target = `${SCHOLAR_BASE}?user=${encodeURIComponent(user)}&hl=${encodeURIComponent(hl)}`;
  const res = await fetch(target, {
    headers: {
      'User-Agent': BROWSER_UA,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    // Let Cloudflare cache the upstream HTML briefly too.
    cf: { cacheTtl: 900, cacheEverything: true },
  });

  if (!res.ok) {
    throw new Error(`scholar HTTP ${res.status}`);
  }

  const stats = []; // ordered td.gsc_rsb_std text values
  const headers = []; // th.gsc_rsb_sth text values (for "Since YYYY")
  let name = '';
  let sawCaptcha = false;

  let statBuf = '';
  let thBuf = '';

  const rewriter = new HTMLRewriter()
    .on('#gsc_prf_in', {
      text(t) {
        name += t.text;
      },
    })
    .on('td.gsc_rsb_std', {
      text(t) {
        statBuf += t.text;
        if (t.lastInTextNode) {
          stats.push(statBuf.trim());
          statBuf = '';
        }
      },
    })
    .on('th.gsc_rsb_sth', {
      text(t) {
        thBuf += t.text;
        if (t.lastInTextNode) {
          headers.push(thBuf.trim());
          thBuf = '';
        }
      },
    })
    .on('#gs_captcha_ccl, #gs_captcha_f, form[action*="Captcha"]', {
      element() {
        sawCaptcha = true;
      },
    });

  await rewriter.transform(res).arrayBuffer();

  if (sawCaptcha) return { blocked: true };

  const num = (s) => parseInt(String(s || '').replace(/[^\d]/g, '') || '0', 10);
  let sinceYear = null;
  for (const h of headers) {
    const m = h.match(/(\d{4})/);
    if (m) {
      sinceYear = parseInt(m[1], 10);
      break;
    }
  }

  // Stats table layout (2 columns: All | Since YYYY):
  //   [0] Citations All   [1] Citations Since
  //   [2] h-index  All    [3] h-index  Since
  //   [4] i10      All    [5] i10      Since
  return {
    name: name.trim(),
    since_year: sinceYear,
    citations: { all: num(stats[0]), since: num(stats[1]) },
    h_index: { all: num(stats[2]), since: num(stats[3]) },
    i10_index: { all: num(stats[4]), since: num(stats[5]) },
    updated_at: Date.now(),
  };
}

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}

/** Re-attach CORS headers to a cached Response (cache may drop some). */
function withCors(res) {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v);
  return new Response(res.body, { status: res.status, headers });
}
