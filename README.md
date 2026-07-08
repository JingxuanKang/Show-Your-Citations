# Show Your Citations 📚

[English](#english) · [中文](#中文)

A Chrome extension that shows your **Google Scholar** citations, **h-index** and
**i10-index** in the toolbar. Fetching runs through a small **self-hosted proxy
service** (bring your own), which you can front with Cloudflare so it works in
**mainland China without a VPN** and sidesteps Google Scholar's bot checks.

![version](https://img.shields.io/badge/version-2.0.0-2f5de3)
![manifest](https://img.shields.io/badge/Manifest-V3-green)
![license](https://img.shields.io/badge/license-MIT-8250df)

---

<a name="english"></a>
## English

### How it works

```
Extension  ──HTTPS──▶  Cloudflare (optional)  ──▶  proxy server  ──▶  scholar.google.com
(popup / SW)           edge cache + China reach     (your VPS)        parse stats server-side
     ▲                                                   │
     └──────────────────────  JSON  ◀────────────────────┘   { citations, h-index, i10-index, … }
```

The extension never talks to Google Scholar directly. It calls **your proxy
server** (`server/`), which fetches and parses the profile and returns clean
JSON. Optionally front that server with Cloudflare for edge caching + China
reachability. This buys three things:

- **Works in China** — a Cloudflare-fronted endpoint is reachable from the
  mainland, and the fetch itself happens on your out-of-China server.
- **No CAPTCHA walls** — Scholar sees one server (not a spray of browser
  requests), and responses are cached for an hour.
- **One place to fix** — when Scholar tweaks its markup, only `server/server.js`
  changes, not the shipped extension.

> **Why not just a Cloudflare Worker?** Google Scholar returns HTTP 403 to
> Cloudflare Workers' shared edge IPs, so a Worker can't fetch Scholar. The proxy
> must run on a normal (non-blocked) server IP. See [Deploy.md](Deploy.md).

### Features

- 📊 Total citations, h-index, i10-index — with the **Since &lt;year&gt;** figures too
- 🔢 Live citation count on the toolbar badge
- 🔔 Desktop notification when your citations or h-index go up
- 🔄 Auto-refresh every 6 hours, with instant cached display on open
- 🌍 China-friendly when you front your proxy with Cloudflare
- 🎨 Clean light/dark UI that follows your system theme

### Install

1. **Deploy the proxy** (once) — see **[Deploy.md](Deploy.md)**. One `docker run`
   on any VPS whose IP Scholar doesn't block.
2. **Load the extension**
   - Grab the latest `show-your-citations-v*.zip` from
     [Releases](https://github.com/JingxuanKang/Show-Your-Citations/releases),
     **or** clone this repo.
   - Open `chrome://extensions/`, enable **Developer mode**, click
     **Load unpacked**, and select the folder (or drag the zip in).
3. **Configure** — click the icon → **Open settings**:
   - Paste your Google Scholar profile URL (the id is extracted automatically).
   - Paste your proxy server URL as the **Proxy endpoint**.
   - Hit **Test connection**, then **Save**.

### Project layout

```
Show-Your-Citations/
├── manifest.json         # MV3 config
├── popup.html/.js        # toolbar UI
├── options.html/.js      # settings
├── background.js         # service worker: schedule, badge, notifications
├── styles.css/options.css
├── lib/api.js            # shared config + fetch + parsing (ES module)
├── server/               # portable proxy service (server.js + Dockerfile)
├── tools/                # icon generator
├── icons/
├── Deploy.md             # how to deploy the proxy
└── package.sh            # build a release zip
```

### Contributing

Issues and PRs welcome. The parsing logic that most often needs love is in
`server/server.js`.

### License

MIT — see [LICENSE](LICENSE).

---

<a name="中文"></a>
## 中文

一个在工具栏显示 **Google Scholar** 引用数、**h 指数**、**i10 指数** 的 Chrome 扩展。
数据抓取经由一个**自托管代理小服务**（自带）完成，前面可挂 Cloudflare，从而
**在中国大陆免梯子可用**，也绕开了 Google Scholar 的反爬验证。

### 工作原理

```
扩展 ──HTTPS──▶ Cloudflare（可选）──▶ 代理服务（你的 VPS）──▶ scholar.google.com
 ▲              边缘缓存 + 国内可达        服务端抓取 + 解析
 └──────────────────  JSON  ◀──────────────────┘  { 引用数, h-index, i10-index, … }
```

扩展从不直接访问 Google Scholar，而是调用**你的代理服务**（`server/`），由它抓取并
解析主页返回干净 JSON；这个服务前面可选挂 Cloudflare 做边缘缓存 + 国内可达。好处：

- **中国可用**——Cloudflare 前置域名大陆可达，抓取本身发生在你墙外的服务器上；
- **不撞验证码**——Scholar 看到的是一台服务器，结果缓存 1 小时；
- **只改一处**——Scholar 改版时只需改 `server/server.js`，不必重发扩展。

> **为什么不用纯 Cloudflare Worker？** Google Scholar 对 Cloudflare Worker 的共享边缘 IP 直接回 403，Worker 抓不到 Scholar。抓取必须跑在普通（未被封）的服务器 IP 上。详见 [Deploy.md](Deploy.md)。

### 功能

- 📊 总引用数、h 指数、i10 指数，附 **Since &lt;年份&gt;** 分列数据
- 🔢 工具栏图标徽章实时显示引用数
- 🔔 引用数 / h 指数上升时桌面通知
- 🔄 每 6 小时自动刷新，打开即显示缓存
- 🌍 代理前挂 Cloudflare 即可大陆可用
- 🎨 跟随系统的明暗双主题

### 安装

1. **部署代理**（一次性）——见 **[Deploy.md](Deploy.md)**，任意不被 Scholar 封的 VPS 上一条 `docker run`。
2. **加载扩展**：从 [Releases](https://github.com/JingxuanKang/Show-Your-Citations/releases)
   下载 zip 或克隆本仓库 → `chrome://extensions/` 开启**开发者模式** → **加载已解压的扩展程序**。
3. **配置**：点图标 → 打开设置 → 填 Scholar 主页 URL + 代理服务地址 → **测试连接** → **保存**。

### 许可证

MIT，详见 [LICENSE](LICENSE)。

---

⭐ Useful? Star the repo. Made for researchers who like watching the number go up.
