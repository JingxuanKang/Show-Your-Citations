# Show Your Citations — agent notes

Chrome MV3 extension that shows Google Scholar citations / h-index / i10-index in
the toolbar, fetching through a Cloudflare Worker proxy so it works in mainland
China without a VPN.

## Architecture (the one thing to understand)

The extension **never fetches scholar.google.com directly**. It calls a
Cloudflare Worker, which does the fetch + parse at the edge and returns JSON.

- `cloudflare/worker.js` — the proxy. Parses Scholar's stats table with
  **HTMLRewriter** (`td.gsc_rsb_std` cells, in order: citations/h/i10 × all/since;
  name from `#gsc_prf_in`; "Since YYYY" from `th.gsc_rsb_sth`). Edge-caches 1h.
  **This is the single source of parsing** — when Scholar changes markup, fix here.
- `lib/api.js` — shared ES module (config, `fetchCitations`, normalize, badge
  text). Imported by popup, background, and options.
- `background.js` — module service worker: 6h alarm, badge, notifications.
- `popup.js` / `options.js` — UI controllers.

## Red lines

- **Never fetch Scholar from the extension client** — it breaks China users and
  hits CAPTCHAs. All fetching goes through the Worker.
- **Proxy endpoint is user-configured** (`apiBase` in `chrome.storage.sync`).
  Don't hardcode a personal Worker URL into shipped code; `DEFAULT_API_BASE` in
  `lib/api.js` stays empty unless deliberately shipping a default.
- **No fabricated git history.** A `create_commit_history.sh` that backdated fake
  empty commits was removed — do not reintroduce anything like it. Commit real
  work with real timestamps.
- **No AI co-author trailers** in commit messages (per global rules).
- Keep the UI light-first with real dark mode via `prefers-color-scheme`; no
  glassmorphism revival.

## Gotchas

- Service worker + popup + options are all ES modules (`"type":"module"`); use
  relative imports from `lib/`.
- Manifest declares `notifications` permission — required for the notify path.
- No `host_permissions` needed: the Worker returns `Access-Control-Allow-Origin: *`.
- Badge formatting lives in `badgeText()` (M before k ordering — do not reorder).

## Docs routing

"What is it / how to use" → README.md. "How to deploy the Worker / fix China
access / caching" → Deploy.md. Architecture / red lines → this file.
