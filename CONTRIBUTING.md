# Contributing

Thanks for your interest in improving Show Your Citations!

## Ways to help

- **Report a bug** — open an issue with steps to reproduce, your Chrome version,
  and (if relevant) what the proxy returns for
  `GET /?user=<your-id>`.
- **Fix Scholar parsing** — when Google Scholar changes its markup, the stats
  can stop parsing. The parser lives in
  [`server/server.js`](server/server.js); a failing example id in the issue
  helps a lot.
- **Improve the UI or docs** — small, focused PRs are easiest to review.

## Development setup

No build step — the extension is plain ES modules.

1. Clone the repo and load the folder as an unpacked extension in
   `chrome://extensions/` (Developer mode → Load unpacked).
2. Run the proxy locally while you work:
   ```bash
   cd server && node server.js      # http://localhost:8080/?user=<id>
   ```
3. Point the extension's **Proxy endpoint** at `http://localhost:8080`.
4. After changing popup/options/background code, hit the reload icon on the
   extension card in `chrome://extensions/`.

## Pull request guidelines

- Keep changes focused; one concern per PR.
- Match the existing code style (2‑space indent, ES modules, no framework).
- Don't add dependencies to `server/` — it's intentionally zero‑dependency so it
  runs with a bare `node server.js` or a tiny Docker image.
- Test the flow end‑to‑end (load the extension, fetch a real profile) before
  opening the PR.

## Scope

This is a small, personal‑use tool. Features that keep it simple and private
(no accounts, no analytics, no third‑party services) are the most likely to be
merged.
