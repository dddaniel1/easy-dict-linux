# Easydict for Linux (MyGo Edition)

> 🇨🇳 优雅的 Linux 桌面多源词典与翻译工具，参考 [tisfeng/Easydict](https://github.com/tisfeng/Easydict)，基于现代化纯 Go 桌面框架 [egoist/mygo](https://github.com/egoist/mygo) 构建，前端采用 **React 19 + Tailwind CSS + [Base UI](https://base-ui.com/) (@base-ui/react) + shadcn 规范设计**。

[![Go Version](https://img.shields.io/badge/Go-1.27%2B-00ADD8?style=flat&logo=go)](https://go.dev/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react)](https://react.dev/)
[![Base UI](https://img.shields.io/badge/Base%20UI-%40base--ui%2Freact-007FFF?style=flat)](https://base-ui.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![Platform](https://img.shields.io/badge/Platform-Linux%20(X11%20%7C%20Wayland)-FCC624?style=flat&logo=linux)](https://kernel.org/)
[![Framework](https://img.shields.io/badge/Framework-egoist%2Fmygo-black)](https://github.com/egoist/mygo)
[![License](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)

---

## ✨ 核心特性

### 1. 完整对齐原版 Easydict 的交互能力

- 🔍 **输入查词**：
  - 全局快捷键（默认 `Alt + A` / `⌥ + A`）一键唤出主窗口，窗口居中并自动聚焦输入框，随时打字查词。
  - 命令行 `easydict --input` 支持在任何窗口管理器中绑定原生快捷键。

- 🖱️ **划词翻译**：
  - **自动弹出悬浮图标**：在任何第三方软件（浏览器、PDF、终端、编辑器等）中选中文本后，光标旁自动弹出微型胶囊/圆形悬浮图标，**点击图标立即翻译，主窗口无需再次点击翻译按钮**。
  - **全局划词快捷键**：默认 `Alt + D` / `⌥ + D`，划词后立即在主窗口中并发聚合查询。
  - 划词翻译只读取 PRIMARY 选区；界面中的“剪贴板”按钮单独读取 CLIPBOARD，复制译文不会覆盖选区。
  - Wayland 优先使用 `wl-paste --primary --type text --watch` 监听选区事件，选区稳定 180 毫秒后显示图标，支持重复选择相同文字。监听协议不可用时回退到轮询；此时无法检测没有内容变化的重复划选。
  - X11 支持 `xclip` / `xsel`。应用必须提供 PRIMARY 选区才能直接取词，不支持选区的软件可使用截图 OCR。

- 📷 **截图划选翻译与静默 OCR**：
  - **截图划选翻译（默认 `Alt + S` / `⌥ + S`）**：触发交互式区域截图（Wayland `slurp` + `grim`，X11 `import`），识别文字后唤起主窗口并发查询各引擎释义。
  - **静默截图 OCR（默认 `Alt + Shift + S` / `⌥ + ⇧ + S`）**：划选屏幕后直接将识别文字复制到剪贴板，并通过桌面系统通知（`notify-send`）即时反馈预览，无需打开主窗口，不中断当前工作流。
  - **多层 OCR 引擎容灾**：首选高精度 Youdao Web OCR API，具备本地 `tesseract` 离线容灾回退。

- 📋 **原生右键菜单集成**：
  - 界面内点击右键弹出原生上下文菜单，支持“翻译选中文本”、“翻译剪贴板内容”、“截图翻译 (Alt+S)”、“静默截图 OCR (Alt+Shift+S)”、“窗口置顶”与“刷新”。

---

### 2. 基于 [Base UI](https://base-ui.com/) 现代化组件库架构

- 前端采用 **MUI 团队出品的下一代无样式组件库 [@base-ui/react](https://base-ui.com/)**：
  - `<Dialog.Root>` / `<Dialog.Popup>` / `<Dialog.Backdrop>`：毛玻璃平滑模态设置面板。
  - `<Tabs.Root>` / `<Tabs.List>` / `<Tabs.Tab>`：键盘可访问、无障碍的多源词典筛选器。
  - `<Checkbox.Root>` / `<Switch.Root>`：优雅的无障碍偏好配置开关。
  - `<Button>` / `<Input>`：Base UI 动作原语与 Tailwind CSS 深度结合。
- **单二进制自包含打包**：通过 `vite-plugin-singlefile` 与 Go `embed`，前端直接内嵌编译进 Go 二进制文件（~17MB），分发安装零外部资源依赖。

---

### 3. 丰富的词典与翻译服务

- **有道词典 (Youdao V4 API)**：英译中词典与翻译，提供英音/美音国际音标、官方真人发音音频、词性词义（名词、动词、形容词等分块展示）、英汉双语例句。其他语言组合请使用 Bing、Google、AI 或 DeepL。
- **Bing 词典与翻译**：微软必应双解词典，自动词形还原与拼音注音。
- **Google 翻译**：多语言自动识别与翻译，内置备用翻译通道。
- **AI 智能词典与翻译**：
  - 兼容 **DeepSeek** (`deepseek-chat`)、**OpenAI** (`gpt-4o-mini`)、**本地 Ollama** (`qwen2.5` / `llama3`) 以及各类 OpenAI 兼容接口。
  - 针对**查词**智能输出结构化 Markdown 释义、发音、实用双语例句与同义词辨析；针对**句子**输出自然流畅的高质量翻译及必要译注。
- **DeepL 翻译**：支持官方 DeepL Free / Pro API。

---

## ⌨️ 快捷键速查与桌面环境绑定

| 功能 | 默认应用内快捷键 | 命令行触发参数 | 说明 |
| :--- | :--- | :--- | :--- |
| **输入查词** | `Alt + A` (⌥ + A) | `easydict -i` 或 `easydict --input` | 唤出主窗口并聚焦输入框 |
| **划词翻译** | `Alt + D` (⌥ + D) | `easydict -s` 或 `easydict --selection` | 翻译当前鼠标高亮选中的文本 |
| **截图划选翻译** | `Alt + S` (⌥ + S) | `easydict --ocr` | 截取屏幕区域 -> OCR -> 打开主窗口翻译 |
| **静默截图 OCR** | `Alt + Shift + S` (⌥ + ⇧ + S) | `easydict --ocr-silent` | 截取屏幕区域 -> OCR -> 复制到剪贴板并桌面通知 |
| **划词悬浮图标** | 鼠标选中文本 | 自动弹出（可在偏好设置开启/关闭） | 点击图标立即翻译 |

### 针对 Wayland 窗口管理器（如 Hyprland / Sway）绑定快捷键示例

在 `~/.config/hypr/hyprland.conf` 中追加：
```ini
bind = ALT, A, exec, easydict --input
bind = ALT, D, exec, easydict --selection
bind = ALT, S, exec, easydict --ocr
bind = ALT SHIFT, S, exec, easydict --ocr-silent
```

在 `~/.config/sway/config` 或 `~/.config/i3/config` 中追加：
```ini
bindsym Mod1+a exec easydict --input
bindsym Mod1+d exec easydict --selection
bindsym Mod1+s exec easydict --ocr
bindsym Mod1+Shift+s exec easydict --ocr-silent
```

---

## 🚀 快速开始

### 依赖环境

- Linux 操作系统（支持 X11 或 Wayland）
- 系统组件：`webkit2gtk-4.1`（现代主流 Linux 发行版均已自带）
- 截图工具（任选其一，用于截图 OCR）：
  - Wayland: `grim` + `slurp` + `wl-clipboard`
  - X11: `imagemagick` (`import`) + `xclip`

### 编译与安装

```bash
# 1. 编译前端（Base UI + Vite）与 Go 二进制
make build

# 2. 运行测试
make test

# 3. 安装到本地系统（安装到 ~/.local/bin 并生成桌面应用图标）
make install
```

在 Hyprland 桌面会话中，可用系统 Python（需 PyGObject）执行 `python3 scripts/check-desktop.py --pid <Easydict进程ID>`，验证划词后焦点和高亮保留、托盘退出及监听进程清理。此检查会打开临时测试窗口，并退出指定的 Easydict 实例。

安装完成后，在终端直接输入：
```bash
easydict
```
即可常驻后台及托盘。

应用默认启用 WebKitGTK 的 DMA-BUF 渲染路径，避免滚动时退回较慢的兼容路径。如果显卡驱动不兼容并出现空白窗口，可用 `WEBKIT_DISABLE_DMABUF_RENDERER=1 easydict` 启动以恢复兼容模式。系统省电模式也会让 WebKit 降低绘制帧率；需要更流畅的滚动时，可使用系统的均衡电源模式。

---

## 🛠️ 项目工程结构

```
easydict-linux/
├── cmd/
│   └── easydict/
│       └── main.go          # 应用主入口、窗口生命周期、托盘菜单、悬浮气泡窗口、全局快捷键
├── frontend/                # React 19 + Tailwind CSS + Base UI (@base-ui/react)
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/          # Base UI 控件 (Button, Input, Select, Toast) 与展示组件 (Card, Badge)
│   │   │   ├── ServiceCard.tsx   # 多源词典卡片展示
│   │   │   └── SettingsModal.tsx # 基于 Base UI Dialog, Checkbox, Switch 的设置面板
│   │   ├── lib/
│   │   │   └── utils.ts     # cn() 样式工具函数 (clsx + tailwind-merge)
│   │   ├── App.tsx          # 顶层交互、右键菜单、截图OCR按钮与 Base UI Tabs
│   │   ├── bubble.tsx       # 基于同一 Button 组件的划词悬浮按钮
│   │   ├── index.css        # Tailwind v4 & Design Tokens 主题变量
│   │   └── types.ts         # TypeScript 类型定义
│   ├── package.json
│   └── vite.config.ts       # 单文件 Vite 构建配置
├── internal/
│   ├── config/
│   │   └── config.go        # 用户偏好设置与持久化 JSON 存储
│   ├── services/
│   │   ├── types.go         # 统一词典与翻译接口及数据模型
│   │   ├── manager.go       # 多服务并发调度中心
│   │   ├── youdao.go        # 有道词典 V4 API（音标、词性分类、例句、音频）
│   │   ├── bing.go          # Bing 双解词典与翻译（含拼音音标）
│   │   ├── google.go        # Google 翻译与多语言备用通道
│   │   ├── ai.go            # OpenAI / DeepSeek / Ollama LLM 结构化解析
│   │   ├── deepl.go         # DeepL 官方 API 服务
│   │   ├── ocr.go           # 截图区域捕获与高精度 OCR 识别引擎
│   │   ├── clipboard.go     # Linux Wayland/X11 划选与剪贴板读取
│   │   └── services_test.go # 单元测试套件
│   ├── bridge/
│   │   └── bridge.go        # mygo.Bind RPC 桥接层（Go <-> Webview 前端）
│   └── assets/
│       ├── icon.go          # 应用与托盘图标生成工具
│       ├── assets.go        # 嵌入主窗口与悬浮按钮的构建产物
│       └── dist/            # 自包含 index.html 与 bubble.html
├── Makefile                 # 自动化编译、测试与安装
├── easydict.desktop         # Linux XDG 桌面入口文件
└── README.md
```

---

## 📄 开源许可证

本项目基于 GPLv3 许可证开源。遵循与原版 [tisfeng/Easydict](https://github.com/tisfeng/Easydict) 一致的开源精神。
