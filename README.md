# Easydict for Linux

一个为 Linux 桌面打造的多源词典与翻译工具。参考
[tisfeng/Easydict](https://github.com/tisfeng/Easydict) 的交互方式，使用 Go +
[mygo](https://github.com/egoist/mygo) 构建原生窗口，界面采用 React 19、Tailwind CSS
和 Base UI。

![Easydict for Linux](assets/screenshot.png)

## 功能

- 多服务并行查询：有道词典、Bing、Google、AI 和 DeepL 可独立启用。
- 词典优先展示：音标、词性、释义、双语例句与发音按钮。
- AI 词典与翻译：兼容 DeepSeek、OpenAI、本地 Ollama 等 OpenAI 风格接口。
- 划词翻译：读取 Linux `PRIMARY` 选区，显示悬浮入口和紧凑翻译浮窗。
- 截图翻译：使用 `slurp` + `grim` 或 ImageMagick 框选区域，再通过 OCR 翻译。
- 静默 OCR：识别后直接复制文本，不打断当前窗口。
- 查询控制：可停止当前查询，并单独重试或刷新某个服务。
- 设置管理：分组设置、快捷键录制、冲突提示、窗口尺寸持久化。
- 系统集成：托盘菜单、原生右键菜单、窗口置顶与桌面快捷键。
- 界面支持浅色、深色和跟随系统主题。

## 快捷键

| 功能 | 默认快捷键 | 命令行参数 |
| --- | --- | --- |
| 输入查词 | `Alt+A` | `easydict --input` |
| 划词翻译 | `Alt+D` | `easydict --selection` |
| 截图翻译 | `Alt+S` | `easydict --ocr` |
| 静默截图 OCR | `Alt+Shift+S` | `easydict --ocr-silent` |

快捷键可在设置中重新录制。保存时会检查格式、应用内重复和 Hyprland 桌面绑定冲突。
如果窗口管理器已经绑定 `easydict --input` 等命令，请保留桌面绑定并关闭应用内同名绑定，
避免一次按键触发两次。

Hyprland 示例：

```ini
bind = ALT, A, exec, easydict --input
bind = ALT, D, exec, easydict --selection
bind = ALT, S, exec, easydict --ocr
bind = ALT SHIFT, S, exec, easydict --ocr-silent
```

Sway / i3 示例：

```ini
bindsym Mod1+a exec easydict --input
bindsym Mod1+d exec easydict --selection
bindsym Mod1+s exec easydict --ocr
bindsym Mod1+Shift+s exec easydict --ocr-silent
```

## 安装

### 依赖

- Linux，支持 Wayland 或 X11
- Go 1.27+
- Node.js 与 pnpm
- `webkit2gtk-4.1`
- Wayland 选区：`wl-clipboard`
- Wayland 截图：`grim` + `slurp`
- X11 选区：`xclip` 或 `xsel`
- X11 截图：ImageMagick 的 `import`
- OCR 可选本地回退：`tesseract`

不同发行版的包名可能不同。例如在 Arch Linux 上可安装：

```bash
sudo pacman -S go nodejs pnpm webkit2gtk-4.1 wl-clipboard grim slurp tesseract
```

### 从源码构建

```bash
pnpm --dir frontend install
make build
make test
make install
```

`make install` 默认安装到 `~/.local/bin/easydict`，同时安装桌面入口和图标。

也可以只编译并直接运行：

```bash
make build
./bin/easydict
```

## 使用

启动后会驻留在托盘：

```bash
easydict
```

常用操作：

- 点击托盘图标打开主窗口或进入偏好设置。
- 选中文字后，点击光标旁的悬浮按钮打开划词浮窗。
- 在划词浮窗中点击“展开”，把当前内容转到主窗口查看。
- 主窗口右键可翻译选中文本、剪贴板内容或启动截图 OCR。
- 按 `Ctrl+,` 打开设置，`Ctrl+Enter` 保存，`Esc` 取消。
- 查询中可点击“停止”；失败或停止的服务可以单独重试。

## 选区与剪贴板

划词翻译读取的是 Linux `PRIMARY` 选区，也就是鼠标选中后用于中键粘贴的内容。
工具栏的“剪贴板 CLIPBOARD”按钮读取的是 `Ctrl+C` 复制的内容。两者互相独立；
复制译文不会覆盖当前 `PRIMARY` 选区。

Wayland 优先使用 `wl-paste --primary --watch` 监听选区。不支持该协议的合成器会回退到
轮询，此时无法识别内容没有变化的重复选择。某些应用不会向 `PRIMARY` 提供文字，可使用
截图 OCR 作为替代。

## 配置

配置文件位于：

```text
~/.config/easydict-linux/config.json
```

API Key 以明文保存在该文件中。请不要把个人配置或密钥提交到版本库。

AI 服务支持 OpenAI 兼容接口，例如：

```text
Base URL: https://api.deepseek.com/v1
Model:    deepseek-chat
```

本地 Ollama 可使用：

```text
Base URL: http://localhost:11434/v1
Model:    qwen2.5:7b
```

## 项目结构

```text
.
├── cmd/easydict/          # 应用入口、窗口、托盘、快捷键与桌面检查逻辑
├── frontend/              # React + Tailwind CSS + Base UI
│   ├── src/components/    # 查询结果、设置面板与 UI 组件
│   ├── src/lib/           # 查询会话、Markdown、快捷键和错误提示
│   └── tests/             # 前端单元测试
├── internal/
│   ├── assets/            # 内嵌前端资源与图标
│   ├── bridge/            # Go 与 WebView 之间的 RPC
│   ├── config/            # 配置加载与持久化
│   ├── services/          # 翻译、词典、OCR、选区与剪贴板
│   └── shortcuts/         # 快捷键规范化与 Hyprland 冲突检测
├── scripts/check-desktop.py
├── Makefile
└── easydict.desktop
```

## 测试

```bash
go test ./...
go vet ./...
cd frontend
pnpm test
pnpm run typecheck
pnpm run build
```

在 Hyprland 会话中可以检查真实桌面交互：

```bash
python3 scripts/check-desktop.py --pid <easydict-pid>
python3 scripts/check-desktop.py --pid <easydict-pid> --selection-popup
```

此脚本会打开临时窗口，并退出指定的 Easydict 实例。当前终端必须能够产生
`PRIMARY` 选区，否则浮窗检查可能因没有选区而跳过。

## 已知限制

- 有道词典主要面向英译中；其他语言组合建议使用 Bing、Google、AI 或 DeepL。
- OCR 首选在线服务，网络不可用时才回退到本地 Tesseract。
- Wayland 全局快捷键的可用性取决于桌面环境与 GlobalShortcuts portal。
- 应用内快捷键和窗口管理器绑定应二选一，否则可能重复触发。

## 许可证

本项目以 [GNU General Public License v3.0](LICENSE) 发布。
