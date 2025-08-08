# Show Your Citations 📚 | 展示你的学术引用

[English](#english) | [中文](#chinese)

---

<a name="english"></a>
## English

A beautiful Chrome extension that displays your Google Scholar citations in real-time with an elegant glass-morphism UI.

![Version](https://img.shields.io/badge/version-1.1.2-blue)
![Chrome](https://img.shields.io/badge/Chrome-Extension-green)
![License](https://img.shields.io/badge/license-MIT-purple)

### ✨ Features

- 📊 **Real-time Citation Tracking** - Display total citations, h-index, and i10-index
- 🎨 **Beautiful Glass-morphism UI** - Modern purple gradient design
- 🔄 **Auto-update** - Automatically checks for updates every 6 hours
- 💾 **Smart Caching** - Fast loading with intelligent cache management
- 🌍 **Works Globally** - Direct access to Google Scholar
- 📈 **Citation Badge** - Shows citation count directly on the extension icon
- 🔔 **Desktop Notifications** - Get notified when your citations increase

### 🚀 Quick Start

#### Method 1: Download Release (Easiest)
1. **Download the latest release**
   - Go to [Releases](https://github.com/JingxuanKang/Show-Your-Citations/releases)
   - Download the latest `show-your-citations-v*.zip`

2. **Install in Chrome**
   - Open `chrome://extensions/`
   - Enable **Developer mode**
   - Drag and drop the `.zip` file directly onto the page
   - Or unzip and click **Load unpacked** to select the folder

3. **Setup**
   - Click the extension icon
   - Enter your Google Scholar profile URL
   - Save and enjoy!

#### Method 2: Clone Repository
```bash
git clone https://github.com/JingxuanKang/Show-Your-Citations.git
cd Show-Your-Citations
```
Then load as unpacked extension in Chrome.


### 📁 Project Structure
```
Show-Your-Citations/
├── manifest.json          # Extension configuration
├── popup.html/js/css      # Main UI
├── background.js          # Auto-update service
├── options.html/js/css    # Settings page
└── icons/                # Extension icons
```

### 📝 Changelog

**v1.1.2** (Latest)
- Added success notification when manually refreshing data
- Improved error handling and user feedback
- Fixed loading spinner issues

**v1.1.0**
- Simplified to direct Google Scholar access
- Removed proxy server dependencies
- Improved connection stability

**v1.0.0**
- Initial release with glass-morphism UI
- Real-time citation tracking
- Auto-update every 6 hours

### 🤝 Contributing

Contributions are welcome! Feel free to submit issues and pull requests.

### 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

<a name="chinese"></a>
## 中文

一个美观的Chrome扩展，实时显示你的Google Scholar引用数据，采用优雅的玻璃拟态UI设计。

![版本](https://img.shields.io/badge/版本-1.1.2-blue)
![Chrome扩展](https://img.shields.io/badge/Chrome-扩展-green)
![许可证](https://img.shields.io/badge/许可证-MIT-purple)

### ✨ 功能特点

- 📊 **实时引用追踪** - 显示总引用数、h指数和i10指数
- 🎨 **精美玻璃拟态UI** - 现代紫色渐变设计
- 🔄 **自动更新** - 每6小时自动检查更新
- 💾 **智能缓存** - 快速加载，智能缓存管理
- 🌍 **全球可用** - 直接访问Google Scholar
- 📈 **引用数徽章** - 在扩展图标上直接显示引用数
- 🔔 **桌面通知** - 引用增加时获得通知

### 🚀 快速开始

#### 方法1：下载发布版（最简单）
1. **下载最新版本**
   - 访问 [Releases](https://github.com/JingxuanKang/Show-Your-Citations/releases)
   - 下载最新的 `show-your-citations-v*.zip`

2. **安装到Chrome**
   - 打开 `chrome://extensions/`
   - 启用**开发者模式**
   - 直接拖拽 `.zip` 文件到页面上
   - 或解压后点击**加载已解压的扩展程序**选择文件夹

3. **设置**
   - 点击扩展图标
   - 输入你的Google Scholar个人主页URL
   - 保存并使用！

#### 方法2：克隆仓库
```bash
git clone https://github.com/JingxuanKang/Show-Your-Citations.git
cd Show-Your-Citations
```
然后在Chrome中加载为已解压的扩展程序。


### 📁 项目结构
```
Show-Your-Citations/
├── manifest.json          # 扩展配置
├── popup.html/js/css      # 主界面
├── background.js          # 自动更新服务
├── options.html/js/css    # 设置页面
└── icons/                # 扩展图标
```

### 📝 更新日志

**v1.1.2** (最新版)
- 手动刷新时添加成功提示
- 改进错误处理和用户反馈
- 修复加载动画问题

**v1.1.0**
- 简化为直接访问Google Scholar
- 移除代理服务器依赖
- 提高连接稳定性

**v1.0.0**
- 初始版本，玻璃拟态UI设计
- 实时引用追踪
- 每6小时自动更新

### 🤝 贡献

欢迎贡献！请随时提交问题和拉取请求。

### 📄 许可证

MIT许可证 - 详见[LICENSE](LICENSE)文件。

---

⭐ **If you find this useful, please star the repository! | 如果觉得有用，请给仓库加星！**

Made with ❤️ for researchers worldwide | 为全球研究者用心打造