<div align="center">

# Show Your Citations

**A Chrome extension that keeps your Google Scholar citations, h‑index and i10‑index one click away — and works in mainland China without a VPN.**

English · [中文](README.zh-CN.md)

[![Version](https://img.shields.io/badge/version-2.0.0-2f5de3)](https://github.com/JingxuanKang/Show-Your-Citations/releases)
[![Manifest](https://img.shields.io/badge/Chrome-Manifest%20V3-1e874b)](manifest.json)
[![Proxy](https://img.shields.io/badge/proxy-Node%20·%20zero--dep-6f8cff)](server/)
[![License](https://img.shields.io/badge/license-MIT-8250df)](LICENSE)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-c0392b)](CONTRIBUTING.md)

<table>
  <tr>
    <td><img src="docs/popup-light.png" width="330" alt="Popup, light theme"></td>
    <td><img src="docs/popup-dark.png" width="330" alt="Popup, dark theme"></td>
  </tr>
</table>

</div>

## Highlights

- 📊 **Total citations, h‑index and i10‑index** at a glance — plus the *Since &lt;year&gt;* figures.
- 🔢 **Live badge** on the toolbar icon shows your citation count.
- 🔔 **Notifications** when your citations or h‑index tick up.
- 🔄 **Auto‑refresh** every 6 hours; the popup shows cached numbers instantly on open.
- 🌍 **China‑friendly** — front your proxy with Cloudflare and it just works, no VPN.
- 🎨 **Clean light/dark UI** that follows your system theme.
- 🔒 **Yours end‑to‑end** — you run the proxy, nothing is sent to any third party.

## How it works

The extension never talks to Google Scholar directly. It calls a small **proxy
server you run**, which fetches and parses your profile and returns clean JSON.
Optionally put Cloudflare in front of that server for edge caching and
mainland‑China reachability.

```
 Extension ──HTTPS──▶ Cloudflare (optional) ──▶ Proxy server ──▶ scholar.google.com
 popup / SW           edge cache · China reach   your VPS (server/)   parsed server-side
     ▲                                                 │
     └──────────────────── JSON ◀──────────────────────┘   { citations, h-index, i10-index, … }
```

> **Why a server and not just a Cloudflare Worker?** Google Scholar returns
> `HTTP 403` to Cloudflare Workers' shared edge IPs, so a Worker can't fetch it.
> The proxy therefore runs on a normal (non‑blocked) server IP; Cloudflare may
> only sit *in front* for caching and reach. Details in [Deploy.md](Deploy.md).

## Quick start

### 1. Run the proxy (once)

Any always‑on host whose IP Scholar doesn't block works (most VPSs do). With Docker:

```bash
cd server
docker build -t scholar-proxy .
docker run -d --restart unless-stopped -p 8080:8080 --name scholar-proxy scholar-proxy
```

Full options — bare Node, Cloudflare fronting for China, caching — are in
**[Deploy.md](Deploy.md)**.

### 2. Load the extension

- Download the latest `show-your-citations-v*.zip` from
  [Releases](https://github.com/JingxuanKang/Show-Your-Citations/releases), **or** clone this repo.
- Open `chrome://extensions/`, turn on **Developer mode**, click **Load unpacked**,
  and select the folder (or drag the zip onto the page).

### 3. Configure

Click the icon → **Open settings**:

| Field | What to enter |
| --- | --- |
| **Google Scholar profile URL** | Your profile address — the user id is extracted automatically. |
| **Proxy endpoint** | The base URL of the server from step 1 (e.g. `https://scholar.example.com`). |

Hit **Test connection**, then **Save**. Done — the count appears on the badge.

## Configuration reference

All settings live in the options page and sync via `chrome.storage.sync`:

| Setting | Default | Description |
| --- | --- | --- |
| Scholar profile / id | — | Which profile to track. |
| Proxy endpoint | *(empty)* | Your proxy server base URL. Required. |
| Desktop notifications | on | Notify when citations / h‑index increase. |
| Auto‑refresh | on | Background refresh every 6 hours. |

The shipped extension has **no default endpoint** on purpose: everyone runs their
own proxy, so no single server ever bears everyone's traffic.

## FAQ

**Does it really work in mainland China?**
Yes, if your proxy server is outside the firewall and you front it with a
Cloudflare‑proxied domain. The Cloudflare edge is reachable from the mainland,
and the actual Scholar fetch happens on your out‑of‑China server.

**Do the numbers match my Google Scholar page?**
Yes — the proxy reads the same stats table Scholar shows on your profile
(citations / h‑index / i10‑index, both *All* and *Since &lt;year&gt;*).

**Where does my data go?**
Nowhere but your own proxy. The server stores nothing on disk; it only fetches
the public Scholar profile id you configure. There is no analytics, no account,
no third‑party endpoint.

**Will Google Scholar rate‑limit me?**
For personal use, no. Your server fetches only your own profile, cached for an
hour, so Scholar sees at most a couple of requests a day. (Don't point many
users at one shared server — that concentration is what triggers rate limits.)

**Is this an official Google product?**
No. It's an unofficial, personal‑use tool and is not affiliated with or endorsed
by Google.

## Development

The extension is plain ES modules — no build step.

```bash
git clone https://github.com/JingxuanKang/Show-Your-Citations.git
cd Show-Your-Citations
# load the folder as an unpacked extension in chrome://extensions

# run the proxy locally while hacking:
cd server && node server.js        # http://localhost:8080/?user=<id>

# build a release zip:
./package.sh
```

The parsing logic that most often needs updating when Scholar changes its markup
lives in [`server/server.js`](server/server.js).

## Project structure

```
Show-Your-Citations/
├── manifest.json          # MV3 config
├── popup.html · popup.js  # toolbar UI
├── options.html · .js     # settings
├── background.js          # service worker: schedule, badge, notifications
├── styles.css · options.css
├── lib/api.js             # shared config + fetch + parsing (ES module)
├── server/                # portable proxy: server.js + Dockerfile
├── tools/                 # icon generator
├── icons/ · docs/
├── Deploy.md              # deploy & self-host the proxy
├── CONTRIBUTING.md
└── package.sh             # build a release zip
```

## Contributing

Issues and pull requests are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE) © Jingxuan Kang

---

<div align="center">
<sub>Not affiliated with Google Scholar. Made for researchers who like watching the number go up. ⭐ it if it's useful.</sub>
</div>
