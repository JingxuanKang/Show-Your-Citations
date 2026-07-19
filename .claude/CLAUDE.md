# Show Your Citations — agent notes

Chrome MV3 extension that shows Google Scholar citations / h-index / i10-index in
the toolbar, fetching through a self-hosted proxy service (optionally fronted by
Cloudflare) so it works in mainland China without a VPN.

## Architecture (the one thing to understand)

The extension **never fetches scholar.google.com directly**. It calls a
**proxy server** the user runs, which does the fetch + parse and returns JSON.

- `server/server.js` — the portable proxy (zero-dep Node http). Fetches the
  profile and regex-parses the stats table (`td.gsc_rsb_std` cells in order:
  citations/h/i10 × all/since; name from `#gsc_prf_in`; "Since YYYY"). 1h
  in-memory cache. **Single source of parsing** — Scholar markup change → fix here.
  Ships with a Dockerfile; anyone can `docker run` it on a non-blocked VPS.
- `lib/api.js` — shared ES module (config, `fetchCitations`, normalize, badge
  text). Imported by popup, background, and options.
- `background.js` — module service worker: 6h alarm, badge, notifications.
- `popup.js` / `options.js` — UI controllers.

## Red lines

- **Google Scholar 403s Cloudflare Workers' shared edge IPs** — a pure Worker
  CANNOT fetch Scholar. The proxy must run on a normal (non-blocked) server IP;
  Cloudflare may only sit *in front* (cache/China reach), never do the fetch.
- **Never fetch Scholar from the extension client** — it breaks China users and
  hits CAPTCHAs. All fetching goes through the proxy server.
- **Proxy endpoint is user-configured** (`apiBase` in `chrome.storage.sync`).
  Don't hardcode a personal server URL into shipped code; `DEFAULT_API_BASE` in
  `lib/api.js` stays empty so installs don't hammer one person's server.
- **No fabricated git history.** Never add scripts that backdate or fabricate
  commits. Commit real work with real timestamps.
- **No AI co-author trailers** in commit messages (per global rules).
- Keep the UI light-first with real dark mode via `prefers-color-scheme`; no
  glassmorphism revival.

## Gotchas

- Service worker + popup + options are all ES modules (`"type":"module"`); use
  relative imports from `lib/`.
- Manifest declares `notifications` permission — required for the notify path.
- No `host_permissions` needed: the proxy returns `Access-Control-Allow-Origin: *`.
- Badge formatting lives in `badgeText()` (M before k ordering — do not reorder).
- `server/server.js` uses regex parsing (no HTMLRewriter — that's Workers-only);
  keep it dependency-free so `docker run` / `node server.js` just works.

## Docs routing

"What is it / how to use" → README.md. "How to deploy the proxy / front with
Cloudflare / fix China access" → Deploy.md. Architecture / red lines → this file.
