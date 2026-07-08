# Deploy the Scholar proxy (Cloudflare Worker)

The extension needs one small Worker running in your own Cloudflare account. It
fetches your Google Scholar profile at the edge and returns JSON. Deploying it
takes a few minutes and stays within Cloudflare's free tier.

## Prerequisites

- A free [Cloudflare account](https://dash.cloudflare.com/sign-up).
- Node.js 18+ (for `wrangler`, Cloudflare's CLI).

## Deploy

```bash
cd cloudflare
npx wrangler login        # opens a browser to authorize
npx wrangler deploy       # publishes worker.js
```

`wrangler` prints the deployed URL, e.g.
`https://scholar-proxy.<your-subdomain>.workers.dev`.

## Verify

```bash
curl "https://scholar-proxy.<your-subdomain>.workers.dev/?user=YOUR_SCHOLAR_ID"
```

You should get JSON like:

```json
{
  "name": "Your Name",
  "since_year": 2020,
  "citations": { "all": 1234, "since": 900 },
  "h_index":   { "all": 18, "since": 15 },
  "i10_index": { "all": 25, "since": 20 },
  "updated_at": 1730000000000
}
```

Put that base URL into the extension's **Proxy endpoint** field.

## Mainland-China reachability — use a custom domain

`*.workers.dev` is frequently polluted or blocked by the GFW, so the default
subdomain may be unreliable inside China. Bind the Worker to a domain in your
own Cloudflare zone instead:

1. Add your domain to Cloudflare (nameservers pointed at Cloudflare).
2. In `wrangler.toml`, set a custom-domain route:

   ```toml
   routes = [
     { pattern = "scholar.example.com", custom_domain = true }
   ]
   ```

3. `npx wrangler deploy` again, then use `https://scholar.example.com` as the
   proxy endpoint.

A domain fronted by Cloudflare's anycast network is far more reliably reachable
from China than a raw `workers.dev` host.

## Notes & limits

- **Caching**: responses are edge-cached for 1 hour (`EDGE_CACHE_SECONDS` in
  `worker.js`) and the upstream Scholar HTML for 15 minutes, so repeated opens
  cost almost nothing and keep Scholar happy.
- **Rate limits**: for personal use this stays well under Cloudflare's free
  100k requests/day. If many people share one Worker, Scholar may occasionally
  return a CAPTCHA to the edge IP — the Worker reports this as HTTP 429 and the
  extension shows "try again shortly".
- **Privacy**: the Worker only ever sees the Scholar ids it is asked to fetch.
  It stores nothing.
- **Updating**: change `worker.js`, run `npx wrangler deploy` again. The shipped
  extension does not need to be rebuilt for proxy-side fixes.
