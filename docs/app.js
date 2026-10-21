/* Easydict for Linux — landing page behaviour.
   Copy lives here in both languages; every translatable node carries
   data-i18n and is filled from this table. */

const COPY = {
  zh: {
    "a11y.skip": "跳到主要内容",
    "nav.label": "页面导航",
    "nav.selection": "划词",
    "nav.sources": "来源",
    "nav.ocr": "截图",
    "nav.details": "细节",
    "nav.install": "安装",

    "hero.title": "选中文字，<br>答案就在光标旁边",
    "hero.lede": "Easydict for Linux 把词典和翻译放进一个小浮窗。选中单词或句子，按 <kbd>Alt</kbd> <kbd>D</kbd>，有道、Bing、Google、AI 与 DeepL 同时开始查询，你不用离开正在读的那一页。",
    "hero.cta": "安装 Easydict",
    "hero.secondary": "查看源码",
    "hero.meta.local": "配置保存在本地",
    "hero.chip": "划词翻译",
    "hero.shotAlt": "Easydict 主窗口：查询 apple，有道词典卡片显示音标、释义与双语例句，Bing 卡片正在加载。",

    "selection.title": "划词翻译：选中，浮窗就在光标旁。",
    "selection.lede": "读取 Linux 的 <code>PRIMARY</code> 选区，也就是鼠标选中后用中键粘贴的那份内容。它和 <kbd>Ctrl</kbd> <kbd>C</kbd> 复制到剪贴板的内容互相独立。",
    "selection.f1.title": "展开到主窗口",
    "selection.f1.body": "浮窗里点「展开」，同一份结果转到主窗口，五个来源完整铺开。",
    "selection.f2.title": "随时可以停",
    "selection.f2.body": "查询中可以停止；某个服务失败或超时，单独重试即可，不必重查全部。",
    "selection.f3.title": "键盘优先",
    "selection.f3.body": "<kbd>Alt</kbd> <kbd>D</kbd> 划词，<kbd>Alt</kbd> <kbd>A</kbd> 直接打开输入框。快捷键可以在设置里重新录制。",
    "selection.expand": "展开",
    "selection.examples": "权威双语例句",
    "selection.demoAlt": "划词翻译演示：一段英文里选中了 crisp, sweet, and a little tart，旁边浮出翻译入口与有道词典结果卡片。",

    "sources.title": "一次查询，<br>五种来源。",
    "sources.lede": "五个服务并发请求，谁先返回谁先显示；词典结果排在翻译前面。",
    "sources.note": "AI 服务支持 OpenAI 兼容接口，可接 DeepSeek、OpenAI 或本地 Ollama；DeepL 使用官方 API Key。",
    "sources.youdao": "音标、词性、释义与权威双语例句",
    "sources.bing": "双解词典与整句翻译",
    "sources.google": "多语言自动识别",
    "sources.ai": "结构化释义与译注，兼容 OpenAI 风格接口",
    "sources.deepl": "官方翻译 API",
    "sources.tagDict": "词典",
    "sources.tagTranslate": "翻译",
    "sources.tagAI": "AI",

    "ocr.title": "屏幕上的字，也能查。",
    "ocr.lede": "框选屏幕上的任意区域，OCR 识别后直接翻译。图片、视频字幕、不能复制的界面，都不再是障碍。",
    "ocr.f1.title": "截图翻译 · <kbd>Alt</kbd> <kbd>S</kbd>",
    "ocr.f1.body": "框选后进入主窗口，原文与译文对照显示。",
    "ocr.f2.title": "静默 OCR · <kbd>Alt</kbd> <kbd>Shift</kbd> <kbd>S</kbd>",
    "ocr.f2.body": "识别后直接复制文本，不打断当前窗口。",
    "ocr.f3.title": "本地回退",
    "ocr.f3.body": "OCR 首选在线服务；网络不可用时回退到本地 Tesseract（可选安装）。",
    "ocr.toolbar": "截图 OCR",
    "ocr.result": "识别完成 · 已复制",
    "ocr.demoAlt": "截图翻译演示：在主窗口上框选一块区域，出现截图 OCR 工具条，识别完成后提示已复制。",

    "details.title": "为 Linux 桌面做的细节。",
    "details.d1.title": "读取 PRIMARY 选区",
    "details.d1.body": "用鼠标选中就足够，不必先按 <kbd>Ctrl</kbd> <kbd>C</kbd>。",
    "details.d2.title": "Wayland 优先监听",
    "details.d2.body": "优先使用 <code>wl-paste --primary --watch</code>；合成器不支持时自动回退到轮询。",
    "details.d3.title": "快捷键冲突检查",
    "details.d3.body": "保存时检查格式、应用内重复，以及 Hyprland 桌面绑定冲突。",
    "details.d4.title": "常驻托盘",
    "details.d4.body": "关闭窗口只是隐藏；窗口尺寸会被记住，下次打开还是原样。",
    "details.d5.title": "主题跟随系统",
    "details.d5.body": "浅色、深色或跟随系统，在设置里一键切换。",
    "details.d6.title": "原生右键菜单",
    "details.d6.body": "在主窗口右键，即可翻译选中文本、剪贴板内容，或启动截图 OCR。",

    "shortcuts.title": "默认快捷键",
    "shortcuts.colAction": "功能",
    "shortcuts.colKeys": "快捷键",
    "shortcuts.colCli": "命令行参数",
    "shortcuts.note": "快捷键可在设置中重新录制，保存时会检查格式与冲突。",
    "shortcuts.input": "输入查词",
    "shortcuts.selection": "划词翻译",
    "shortcuts.ocr": "截图翻译",
    "shortcuts.ocrSilent": "静默截图 OCR",

    "install.title": "从源码安装。",
    "install.lede": "需要 Go 1.27+、Node.js 与 pnpm，以及 webkit2gtk-4.1。<code>make install</code> 会把程序装到 <code>~/.local/bin</code>，并注册桌面入口与图标。",
    "install.copy": "复制",
    "install.copyAria": "复制安装命令",
    "install.copied": "已复制",
    "install.run": "安装后运行 <code>easydict</code>。开发时可执行 <code>make test</code>，运行 Go 与前端测试。",
    "install.wm.title": "桌面快捷键绑定",
    "install.wm.tabsAria": "窗口管理器",
    "install.wm.note": "如果窗口管理器已经绑定这些命令，请关闭应用内同名快捷键，避免一次按键触发两次。",
    "install.deps.title": "依赖",
    "install.deps.arch": "Arch Linux 一次装齐：",
    "install.deps.wayland": "Wayland",
    "install.deps.or": "或",
    "install.deps.ocr": "可选本地回退：<code>tesseract</code>",
    "install.deps.note": "不同发行版的包名可能不同；Arch 之外的系统请按对应名称安装。",

    "footer.limitsTitle": "已知限制",
    "footer.limit1": "有道词典主要面向英译中；其他语言组合建议使用 Bing、Google、AI 或 DeepL。",
    "footer.limit2": "Wayland 全局快捷键能否使用，取决于桌面环境与 GlobalShortcuts portal。",
    "footer.limit3": "应用内快捷键与窗口管理器绑定应二选一，否则会重复触发。",
    "footer.config": "配置保存在 <code>~/.config/easydict-linux/config.json</code>；API Key 以明文写入该文件。",
    "footer.credit": "交互方式参考 <a href=\"https://github.com/tisfeng/Easydict\" target=\"_blank\" rel=\"noreferrer\">tisfeng/Easydict</a>，使用 Go、mygo、React 与 Base UI 构建。",

    "meta.title": "Easydict for Linux — 选中文字，答案就在光标旁边",
    "meta.desc": "Easydict for Linux 是一个为 Linux 桌面打造的多源词典与翻译工具：划词翻译、截图 OCR、五家来源并发查询。Go + React，GPL-3.0。",
  },

  en: {
    "a11y.skip": "Skip to main content",
    "nav.label": "Page navigation",
    "nav.selection": "Selection",
    "nav.sources": "Sources",
    "nav.ocr": "Screenshot",
    "nav.details": "Details",
    "nav.install": "Install",

    "hero.title": "Select text.<br>The answer is right there",
    "hero.lede": "Easydict for Linux puts a dictionary and a translator in a small popup. Select a word or a sentence, press <kbd>Alt</kbd> <kbd>D</kbd>, and Youdao, Bing, Google, AI and DeepL all start at once, without leaving the page you are reading.",
    "hero.cta": "Install Easydict",
    "hero.secondary": "View source",
    "hero.meta.local": "Config stays local",
    "hero.chip": "Selection lookup",
    "hero.shotAlt": "The Easydict main window: a lookup for “apple”, with the Youdao card showing phonetics, definitions and bilingual examples while Bing is still loading.",

    "selection.title": "Select text, and the popup appears beside the cursor.",
    "selection.lede": "It reads the Linux <code>PRIMARY</code> selection, the text you middle-click paste after highlighting it. That is kept separate from whatever you copy to the clipboard with <kbd>Ctrl</kbd> <kbd>C</kbd>.",
    "selection.f1.title": "Expand into the main window",
    "selection.f1.body": "Hit “expand” in the popup and the same result moves into the main window, with all five sources laid out in full.",
    "selection.f2.title": "Stop whenever you like",
    "selection.f2.body": "Cancel a running lookup; if one service fails or times out, retry just that one instead of starting over.",
    "selection.f3.title": "Keyboard first",
    "selection.f3.body": "<kbd>Alt</kbd> <kbd>D</kbd> for a selection, <kbd>Alt</kbd> <kbd>A</kbd> for the input box. Every shortcut can be re-recorded in settings.",
    "selection.expand": "Expand",
    "selection.examples": "Bilingual examples",
    "selection.demoAlt": "A selection-lookup demo: “crisp, sweet, and a little tart” is highlighted in a paragraph, with a translate button and a Youdao result card beside it.",

    "sources.title": "One lookup.<br>Five sources.",
    "sources.lede": "All five services are queried in parallel and shown as they return; dictionary results rank above translations.",
    "sources.note": "The AI service speaks any OpenAI-compatible API, including DeepSeek, OpenAI or a local Ollama model. DeepL uses its official API key.",
    "sources.youdao": "Phonetics, parts of speech, definitions and bilingual examples",
    "sources.bing": "Bilingual dictionary plus full-sentence translation",
    "sources.google": "Automatic language detection",
    "sources.ai": "Structured definitions and translator's notes, OpenAI-compatible",
    "sources.deepl": "Official translation API",
    "sources.tagDict": "Dictionary",
    "sources.tagTranslate": "Translate",
    "sources.tagAI": "AI",

    "ocr.title": "The words on your screen, too.",
    "ocr.lede": "Drag over any region of the screen and translate what OCR finds there. Images, video subtitles and uncopyable interfaces stop being obstacles.",
    "ocr.f1.title": "Screenshot translate · <kbd>Alt</kbd> <kbd>S</kbd>",
    "ocr.f1.body": "The selection opens in the main window, source and translation side by side.",
    "ocr.f2.title": "Silent OCR · <kbd>Alt</kbd> <kbd>Shift</kbd> <kbd>S</kbd>",
    "ocr.f2.body": "Recognised text goes straight to the clipboard without interrupting the current window.",
    "ocr.f3.title": "Local fallback",
    "ocr.f3.body": "OCR prefers online services and falls back to a local Tesseract when the network is unavailable (optional install).",
    "ocr.toolbar": "Screenshot OCR",
    "ocr.result": "Recognised · copied",
    "ocr.demoAlt": "A screenshot-translation demo: a region of the main window is selected, a screenshot-OCR toolbar appears, and the result is copied.",

    "details.title": "Details built for the Linux desktop.",
    "details.d1.title": "Reads the PRIMARY selection",
    "details.d1.body": "Highlighting with the mouse is enough, with no <kbd>Ctrl</kbd> <kbd>C</kbd> first.",
    "details.d2.title": "Wayland-first watching",
    "details.d2.body": "Uses <code>wl-paste --primary --watch</code> where supported, and falls back to polling on compositors that do not.",
    "details.d3.title": "Shortcut conflict checks",
    "details.d3.body": "Saving validates the format, in-app duplicates and clashes with Hyprland bindings.",
    "details.d4.title": "Lives in the tray",
    "details.d4.body": "Closing the window only hides it, and the window size is remembered for next time.",
    "details.d5.title": "Follows your theme",
    "details.d5.body": "Light, dark or system, switched in settings.",
    "details.d6.title": "Native context menu",
    "details.d6.body": "Right-click the main window to translate the selection or the clipboard, or to start screenshot OCR.",

    "shortcuts.title": "Default shortcuts",
    "shortcuts.colAction": "Action",
    "shortcuts.colKeys": "Shortcut",
    "shortcuts.colCli": "CLI flag",
    "shortcuts.note": "Shortcuts can be re-recorded in settings; saving validates the format and checks for conflicts.",
    "shortcuts.input": "Type to look up",
    "shortcuts.selection": "Selection lookup",
    "shortcuts.ocr": "Screenshot translate",
    "shortcuts.ocrSilent": "Silent screenshot OCR",

    "install.title": "Install from source.",
    "install.lede": "You need Go 1.27+, Node.js with pnpm, and webkit2gtk-4.1. <code>make install</code> puts the binary in <code>~/.local/bin</code> and registers the desktop entry and icon.",
    "install.copy": "Copy",
    "install.copyAria": "Copy install commands",
    "install.copied": "Copied",
    "install.run": "Run <code>easydict</code> once installed. While developing, <code>make test</code> runs the Go and frontend suites.",
    "install.wm.title": "Desktop key bindings",
    "install.wm.tabsAria": "Window manager",
    "install.wm.note": "If your window manager already binds these commands, turn off the matching in-app shortcut so one keypress does not fire twice.",
    "install.deps.title": "Dependencies",
    "install.deps.arch": "On Arch Linux, in one go:",
    "install.deps.wayland": "Wayland",
    "install.deps.or": "or",
    "install.deps.ocr": "Optional local fallback: <code>tesseract</code>",
    "install.deps.note": "Package names differ between distributions; install the equivalents on non-Arch systems.",

    "footer.limitsTitle": "Known limitations",
    "footer.limit1": "Youdao is primarily English → Chinese; for other language pairs use Bing, Google, AI or DeepL.",
    "footer.limit2": "Wayland global shortcuts depend on your desktop environment and the GlobalShortcuts portal.",
    "footer.limit3": "Use either in-app shortcuts or window-manager bindings, not both, or each keypress fires twice.",
    "footer.config": "Configuration lives in <code>~/.config/easydict-linux/config.json</code>; API keys are stored there in plain text.",
    "footer.credit": "Interaction model inspired by <a href=\"https://github.com/tisfeng/Easydict\" target=\"_blank\" rel=\"noreferrer\">tisfeng/Easydict</a>, built with Go, mygo, React and Base UI.",

    "meta.title": "Easydict for Linux — the answer beside your cursor",
    "meta.desc": "A multi-source dictionary and translator for the Linux desktop: selection lookup, screenshot OCR and five sources queried in parallel. Go + React, GPL-3.0.",
  },
};

const STORAGE_KEY = "easydict-landing-lang";

const html = document.documentElement;
html.classList.add("has-js");

function preferredLang() {
  let stored = null;
  try {
    stored = localStorage.getItem(STORAGE_KEY);
  } catch (_) {
    /* private mode: fall through to the browser preference */
  }
  if (stored === "zh" || stored === "en") return stored;
  return (navigator.language || "zh").toLowerCase().startsWith("zh") ? "zh" : "en";
}

function applyLang(lang) {
  const dict = COPY[lang];
  if (!dict) return;

  html.lang = lang === "zh" ? "zh-CN" : "en";

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const value = dict[el.dataset.i18n];
    if (value !== undefined) el.innerHTML = value;
  });

  document.querySelectorAll("[data-i18n-attr]").forEach((el) => {
    el.dataset.i18nAttr.split(",").forEach((pair) => {
      const [attr, key] = pair.split(":");
      const value = dict[key.trim()];
      if (attr && value !== undefined) el.setAttribute(attr.trim(), value);
    });
  });

  document.title = dict["meta.title"];
  const desc = document.querySelector('meta[name="description"]');
  if (desc) desc.setAttribute("content", dict["meta.desc"]);

  const toggle = document.getElementById("langToggle");
  if (toggle) {
    toggle.querySelector("span").textContent = lang === "zh" ? "EN" : "中文";
    toggle.setAttribute("aria-label", lang === "zh" ? "Switch to English" : "切换到中文");
    toggle.setAttribute("title", lang === "zh" ? "Switch to English" : "切换到中文");
  }

  document.querySelectorAll(".copy-btn").forEach((btn) => {
    if (btn.classList.contains("is-copied")) {
      btn.querySelector("span").textContent = dict["install.copied"];
    }
  });

  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch (_) {
    /* storage unavailable; the choice simply does not persist */
  }
}

let currentLang = preferredLang();
applyLang(currentLang);

document.getElementById("langToggle")?.addEventListener("click", () => {
  currentLang = currentLang === "zh" ? "en" : "zh";
  applyLang(currentLang);
});

/* ---------- Header hairline ---------- */

const header = document.getElementById("siteHeader");
const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
onScroll();
window.addEventListener("scroll", onScroll, { passive: true });

/* ---------- Reveal on scroll ---------- */

const reveals = document.querySelectorAll(".reveal, .reveal-hero");

if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
  );
  reveals.forEach((el) => io.observe(el));
} else {
  reveals.forEach((el) => el.classList.add("is-in"));
}

/* ---------- Copy install commands ---------- */

const live = document.getElementById("liveRegion");

document.querySelectorAll(".copy-btn").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const target = document.querySelector(btn.dataset.copy);
    if (!target) return;
    const text = target.innerText;

    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch (_) {
      // Clipboard API needs a secure context; fall back to a hidden textarea.
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      try {
        ok = document.execCommand("copy");
      } catch (_) {
        ok = false;
      }
      area.remove();
    }

    if (!ok) {
      if (live) live.textContent = COPY[currentLang]["install.copyAria"];
      return;
    }

    btn.classList.add("is-copied");
    const label = btn.querySelector("span");
    const icon = btn.querySelector("use");
    if (label) label.textContent = COPY[currentLang]["install.copied"];
    if (icon) icon.setAttribute("href", "#i-check");
    if (live) live.textContent = COPY[currentLang]["install.copied"];

    window.setTimeout(() => {
      btn.classList.remove("is-copied");
      if (label) label.textContent = COPY[currentLang]["install.copy"];
      if (icon) icon.setAttribute("href", "#i-copy");
    }, 1800);
  });
});

/* ---------- Window-manager tabs ---------- */

const tabs = Array.from(document.querySelectorAll(".tab"));

function selectTab(tab, focus) {
  tabs.forEach((t) => {
    const active = t === tab;
    t.classList.toggle("is-active", active);
    t.setAttribute("aria-selected", String(active));
    t.tabIndex = active ? 0 : -1;
    const panel = document.getElementById(t.getAttribute("aria-controls"));
    if (panel) panel.hidden = !active;
  });
  if (focus) tab.focus();
}

tabs.forEach((tab, i) => {
  tab.addEventListener("click", () => selectTab(tab, false));
  tab.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const dir = event.key === "ArrowRight" ? 1 : -1;
    selectTab(tabs[(i + dir + tabs.length) % tabs.length], true);
  });
});
