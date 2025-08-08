# Show Your Citations 📚 | 展示你的学术引用

[English](#english) | [中文](#chinese)

---

<a name="english"></a>
## English

A beautiful Chrome extension that displays your Google Scholar citations in real-time with an elegant glass-morphism UI.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Chrome](https://img.shields.io/badge/Chrome-Extension-green)
![License](https://img.shields.io/badge/license-MIT-purple)

### ✨ Features

- 📊 **Real-time Citation Tracking** - Display total citations, h-index, and i10-index
- 🎨 **Beautiful Glass-morphism UI** - Modern purple gradient design
- 🔄 **Auto-update** - Automatically checks for updates every 6 hours
- 💾 **Smart Caching** - Fast loading with intelligent cache management
- 🌍 **Works Globally** - Including mainland China (with proxy support)
- 📈 **Citation Badge** - Shows citation count directly on the extension icon
- 🔔 **Desktop Notifications** - Get notified when your citations increase

### 🚀 Quick Start

1. **Install the Extension**
   ```bash
   git clone https://github.com/JingxuanKang/Show-Your-Citations.git
   cd Show-Your-Citations
   ```

2. **Load in Chrome**
   - Open `chrome://extensions/`
   - Enable **Developer mode**
   - Click **Load unpacked** and select the project folder

3. **Setup**
   - Click the extension icon
   - Enter your Google Scholar profile URL
   - Save and enjoy!

### 🌐 For Users in China

The extension works in mainland China without VPN! It automatically:
- Tries direct connection first (if you have proxy)
- Falls back to CORS proxy services
- Supports custom Cloudflare Worker deployment

### 📁 Project Structure
```
Show-Your-Citations/
├── manifest.json          # Extension configuration
├── popup.html/js/css      # Main UI
├── background.js          # Auto-update service
├── options.html/js/css    # Settings page
├── cloudflare/           # Proxy worker code
└── icons/                # Extension icons
```

### 🤝 Contributing

Contributions are welcome! Feel free to submit issues and pull requests.

### 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

<a name="chinese"></a>
## 中文

一个美观的Chrome扩展，实时显示你的Google Scholar引用数据，采用优雅的玻璃拟态UI设计。

![版本](https://img.shields.io/badge/版本-1.0.0-blue)
![Chrome扩展](https://img.shields.io/badge/Chrome-扩展-green)
![许可证](https://img.shields.io/badge/许可证-MIT-purple)

### ✨ 功能特点

- 📊 **实时引用追踪** - 显示总引用数、h指数和i10指数
- 🎨 **精美玻璃拟态UI** - 现代紫色渐变设计
- 🔄 **自动更新** - 每6小时自动检查更新
- 💾 **智能缓存** - 快速加载，智能缓存管理
- 🌍 **全球可用** - 包括中国大陆（支持代理）
- 📈 **引用数徽章** - 在扩展图标上直接显示引用数
- 🔔 **桌面通知** - 引用增加时获得通知

### 🚀 快速开始

1. **安装扩展**
   ```bash
   git clone https://github.com/JingxuanKang/Show-Your-Citations.git
   cd Show-Your-Citations
   ```

2. **加载到Chrome**
   - 打开 `chrome://extensions/`
   - 启用**开发者模式**
   - 点击**加载已解压的扩展程序**，选择项目文件夹

3. **设置**
   - 点击扩展图标
   - 输入你的Google Scholar个人主页URL
   - 保存并使用！

### 🌐 中国用户特别说明

扩展在中国大陆无需VPN即可使用！它会自动：
- 首先尝试直接连接（如果你有代理）
- 回退到CORS代理服务
- 支持自定义Cloudflare Worker部署

### 📁 项目结构
```
Show-Your-Citations/
├── manifest.json          # 扩展配置
├── popup.html/js/css      # 主界面
├── background.js          # 自动更新服务
├── options.html/js/css    # 设置页面
├── cloudflare/           # 代理worker代码
└── icons/                # 扩展图标
```

### 🤝 贡献

欢迎贡献！请随时提交问题和拉取请求。

### 📄 许可证

MIT许可证 - 详见[LICENSE](LICENSE)文件。

---

⭐ **If you find this useful, please star the repository! | 如果觉得有用，请给仓库加星！**

Made with ❤️ for researchers worldwide | 为全球研究者用心打造