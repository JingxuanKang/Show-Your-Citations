# Deploy the Scholar proxy

The extension needs a small proxy service that fetches your Google Scholar
profile server-side and returns JSON. You run it yourself and point the
extension at it (the **Proxy endpoint** field in settings).

## Why a server (and not a Cloudflare Worker)

Google Scholar **returns HTTP 403 to datacenter IPs it distrusts — including
Cloudflare Workers' shared edge IPs** — so a pure Worker cannot fetch Scholar.
A normal VPS IP is almost always fine. So the proxy is a tiny standalone HTTP
server; put Cloudflare *in front of it* (optional) for CDN caching and
mainland-China reachability, but the fetch itself must originate from a
non-blocked IP.

Pick a host whose IP Scholar does not block: any small VPS (tested working on
Oracle Cloud, and most providers), or an always-on machine of your own.

## Run it

### Option A — Docker (recommended)

```bash
cd server
docker build -t scholar-proxy .
docker run -d --restart unless-stopped -p 8080:8080 --name scholar-proxy scholar-proxy
```

### Option B — Node directly

```bash
cd server
node server.js          # listens on :8080  (PORT=9000 node server.js to change)
```

Keep it alive with your process manager of choice (systemd, pm2, …).

## Verify

```bash
curl "http://YOUR_HOST:8080/?user=YOUR_SCHOLAR_ID"
```

Expected:

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

## Front it with Cloudflare (optional, for China + caching)

A raw `http://ip:8080` works but has no TLS, no CDN, and may be unreachable from
mainland China. Front the server with a Cloudflare-proxied hostname:

- **Cloudflare Tunnel** — run `cloudflared` on the same host and route a
  hostname (e.g. `scholar.example.com`) to `http://localhost:8080`. No open
  ports, automatic TLS.
- **Proxied DNS** — point an orange-clouded `A`/`CNAME` record at the host and
  put the server behind TLS.

Because the server sends `Cache-Control: public, max-age=3600`, Cloudflare
edge-caches each profile for an hour, so repeated opens are fast and Scholar is
hit at most once per hour per profile. A domain fronted by Cloudflare's anycast
network is also far more reliably reachable from China than a bare IP.

Then use `https://scholar.example.com` as the proxy endpoint.

## Notes & limits

- **Caching**: 1h in-memory in the server (`CACHE_TTL_MS`) plus Cloudflare edge
  cache if fronted, so Scholar sees minimal traffic.
- **Rate limits**: if a shared endpoint fetches many profiles, Scholar may
  occasionally CAPTCHA the IP — the server reports this as HTTP 429 and the
  extension shows "try again shortly".
- **Privacy**: the server only ever sees the Scholar ids it is asked to fetch;
  it stores nothing on disk.
