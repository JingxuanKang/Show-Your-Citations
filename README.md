# Show Your Citations 📚

[English](#english) · [中文](#中文)

A Chrome extension that shows your **Google Scholar** citations, **h-index** and
**i10-index** in the toolbar. Fetching runs through a small **Cloudflare Worker**
proxy, so it works in **mainland China without a VPN** and sidesteps Google
Scholar's bot checks.

![version](https://img.shields.io/badge/version-2.0.0-2f5de3)
![manifest](https://img.shields.io/badge/Manifest-V3-green)
![license](https://img.shields.io/badge/license-MIT-8250df)

---

<a name="english"></a>
## English

### How it works

```
Extension  ──HTTPS──▶  Cloudflare Worker  ──▶  scholar.google.com
(popup / SW)           (edge, outside GFW)      parse stats server-side
     ▲                        │
     └────────  JSON  ◀───────┘   { citations, h-index, i10-index, … }
```

The extension never talks to Google Scholar directly. It calls your Worker,
which fetches and parses the profile at Cloudflare's edge and returns clean
JSON. That single indirection buys three things:

- **Works in China** — the edge fetch happens outside the firewall.
- **No CAPTCHA walls** — Scholar sees a server, not a spray of browser requests,
  and results are edge-cached for an hour.
- **One place to fix** — when Scholar tweaks its markup, only `cloudflare/worker.js`
  changes, not the shipped extension.

### Features

- 📊 Total citations, h-index, i10-index — with the **Since &lt;year&gt;** figures too
- 🔢 Live citation count on the toolbar badge
- 🔔 Desktop notification when your citations or h-index go up
- 🔄 Auto-refresh every 6 hours, with instant cached display on open
- 🌍 China-friendly via your own Cloudflare Worker
- 🎨 Clean light/dark UI that follows your system theme

### Install

1. **Deploy the proxy** (once) — see **[Deploy.md](Deploy.md)**. Takes ~3 minutes
   with `wrangler`.
2. **Load the extension**
   - Grab the latest `show-your-citations-v*.zip` from
     [Releases](https://github.com/JingxuanKang/Show-Your-Citations/releases),
     **or** clone this repo.
   - Open `chrome://extensions/`, enable **Developer mode**, click
     **Load unpacked**, and select the folder (or drag the zip in).
3. **Configure** — click the icon → **Open settings**:
   - Paste your Google Scholar profile URL (the id is extracted automatically).
   - Paste your Worker URL as the **Proxy endpoint**.
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
├── cloudflare/           # the Worker proxy (worker.js + wrangler.toml)
├── tools/                # icon generator
├── icons/
├── Deploy.md             # how to deploy the Worker
└── package.sh            # build a release zip
```

### Contributing

Issues and PRs welcome. The parsing logic that most often needs love is in
`cloudflare/worker.js`.

### License

MIT — see [LICENSE](LICENSE).

---

<a name="中文"></a>
## 中文

一个在工具栏显示 **Google Scholar** 引用数、**h 指数**、**i10 指数** 的 Chrome 扩展。
数据抓取经由一个轻量 **Cloudflare Worker** 代理完成，因此**在中国大陆免梯子可用**，
也绕开了 Google Scholar 的反爬验证。

### 工作原理

```
扩展 ──HTTPS──▶ Cloudflare Worker（边缘，墙外）──▶ scholar.google.com
 ▲                     │  服务端抓取 + 解析
 └──────  JSON  ◀───────┘  { 引用数, h-index, i10-index, … }
```

扩展本身从不直接访问 Google Scholar，而是调用你的 Worker，由它在 Cloudflare 边缘
抓取并解析主页，返回干净 JSON。这一层带来三个好处：

- **中国可用**——抓取发生在墙外的边缘节点；
- **不撞验证码**——Scholar 看到的是一台服务器，结果还有 1 小时边缘缓存；
- **只改一处**——Scholar 改版时只需改 `cloudflare/worker.js`，不必重发扩展。

### 功能

- 📊 总引用数、h 指数、i10 指数，附 **Since &lt;年份&gt;** 分列数据
- 🔢 工具栏图标徽章实时显示引用数
- 🔔 引用数 / h 指数上升时桌面通知
- 🔄 每 6 小时自动刷新，打开即显示缓存
- 🌍 通过你自己的 Cloudflare Worker 实现大陆可用
- 🎨 跟随系统的明暗双主题

### 安装

1. **部署代理**（一次性）——见 **[Deploy.md](Deploy.md)**，用 `wrangler` 约 3 分钟。
2. **加载扩展**：从 [Releases](https://github.com/JingxuanKang/Show-Your-Citations/releases)
   下载 zip 或克隆本仓库 → `chrome://extensions/` 开启**开发者模式** → **加载已解压的扩展程序**。
3. **配置**：点图标 → 打开设置 → 填 Scholar 主页 URL + Worker 地址 → **测试连接** → **保存**。

### 许可证

MIT，详见 [LICENSE](LICENSE)。

---

⭐ Useful? Star the repo. Made for researchers who like watching the number go up.
