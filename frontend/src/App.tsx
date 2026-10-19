import React, { useState, useEffect, useRef } from "react";
import { ServiceResult, AppConfig } from "@/types";
import { ServiceCard } from "@/components/ServiceCard";
import { SettingsModal } from "@/components/SettingsModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Toast } from "@/components/ui/toast";
import { Tabs } from "@base-ui/react";
import { enabledServices, startQuery, translationSettingsChanged } from "@/lib/query";
import {
  Search,
  Pin,
  Settings,
  ArrowRightLeft,
  ClipboardCopy,
  Crop,
  X,
} from "lucide-react";

function applyTheme(theme: AppConfig["theme"]) {
  document.documentElement.classList.toggle(
    "dark",
    theme === "dark" || (theme === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches)
  );
}

export function App() {
  const [query, setQuery] = useState("");
  const [fromLang, setFromLang] = useState("auto");
  const [toLang, setToLang] = useState("zh-CN");
  const [results, setResults] = useState<ServiceResult[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const [isPinned, setIsPinned] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const toastManager = Toast.useToastManager();
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const configRef = useRef<AppConfig | null>(null);
  const querySession = useRef<ReturnType<typeof startQuery> | null>(null);
  const queryVersion = useRef(0);

  useEffect(() => () => querySession.current?.cancel(), []);

  const showToast = (msg: string) => {
    toastManager.add({ title: msg });
  };

  const callGo = (method: string, ...args: any[]) => {
    if (window.mygo && window.mygo.call) {
      return window.mygo.call(method, ...args);
    }
    console.warn("mygo IPC not available");
    return Promise.reject(new Error("mygo not initialized"));
  };

  // Bind global RPC hooks for Go runtime
  useEffect(() => {
    window.__easydict_query = (text: string) => {
      if (text) {
        setQuery(text);
        executeSearch(text, fromLang, toLang);
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
          }
        }, 50);
      }
    };
    window.__easydict_focus_input = () => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    };
    window.__easydict_set_pinned = (pinned: boolean) => {
      setIsPinned(pinned);
    };
    window.__easydict_open_settings = () => {
      setIsSettingsOpen(true);
    };

    // Native context menu trigger
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      const selection = window.getSelection()?.toString() || "";
      callGo("AppBridge.ShowContextMenu", selection);
    };
    window.addEventListener("contextmenu", handleContextMenu);

    // Global keyboard shortcuts inside window
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if ((e.ctrlKey || e.metaKey) && e.key === ",") {
        e.preventDefault();
        setIsSettingsOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        e.preventDefault();
        if (isSettingsOpen) {
          setIsSettingsOpen(false);
        } else {
          callGo("AppBridge.HideWindow");
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      delete window.__easydict_query;
      delete window.__easydict_focus_input;
      delete window.__easydict_set_pinned;
      delete window.__easydict_open_settings;
      window.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [fromLang, toLang, config, isSettingsOpen]);

  // Load configuration on mount
  useEffect(() => {
    callGo("AppBridge.GetConfig")
      .then((cfg: AppConfig) => {
        configRef.current = cfg;
        setConfig(cfg);
        if (cfg.default_target_lang) setToLang(cfg.default_target_lang);
        setIsPinned(cfg.always_on_top);

        applyTheme(cfg.theme);

        const version = queryVersion.current;
        return callGo("AppBridge.Ready").then((pending: string) => {
          if (pending && queryVersion.current === version) {
            setQuery(pending);
            executeSearch(pending, fromLang, cfg.default_target_lang || toLang);
          } else if (!pending && cfg.auto_query_clipboard && version === 0) {
            return callGo("AppBridge.GetClipboardText").then((clipText: string) => {
              if (queryVersion.current === version && clipText && clipText.trim().length < 300) {
                setQuery(clipText.trim());
                executeSearch(clipText.trim(), fromLang, cfg.default_target_lang || toLang);
              }
            });
          }
        });
      })
      .catch((err) => console.warn(err));

    inputRef.current?.focus();
  }, []);

  const executeSearch = (
    text: string,
    fLang = fromLang,
    tLang = toLang
  ) => {
    const q = text.trim();
    queryVersion.current++;
    querySession.current?.cancel();
    querySession.current = null;
    if (!q) {
      setResults([]);
      return;
    }

    const enabled = enabledServices(configRef.current);
    if (enabled.length === 0) {
      setResults([]);
      showToast("请在设置中启用并配置翻译服务");
      return;
    }
    setResults(
      enabled.map((id) => ({
        service_id: id,
        service_name: getServiceName(id),
        status: "loading",
        is_dictionary: false,
      }))
    );

    querySession.current = startQuery(
      enabled,
      (id) => callGo("AppBridge.QuerySingle", id, {
        text: q, from_lang: fLang, to_lang: tLang,
      }),
      (result) => setResults((prev) => prev.map((r) =>
        r.service_id === result.service_id ? result : r
      )),
    );
  };

  const getServiceName = (id: string) => {
    switch (id) {
      case "youdao":
        return "有道词典";
      case "bing":
        return "Bing 词典 / 翻译";
      case "google":
        return "Google 翻译";
      case "ai":
        return config && config.ai_model ? `AI (${config.ai_model})` : "AI 智能词典";
      case "deepl":
        return "DeepL 翻译";
      default:
        return id;
    }
  };

  const handleRefreshSingle = (serviceId: string) => {
    if (!querySession.current) return;

    setResults((prev) =>
      prev.map((r) =>
        r.service_id === serviceId ? { ...r, status: "loading" } : r
      )
    );

    void querySession.current.refresh(serviceId);
  };

  const handleCopy = (text: string) => {
    if (!text) return;
    callGo("AppBridge.CopyText", text).then((ok: boolean) => {
      if (ok) {
        showToast("已复制到剪贴板");
      } else {
        navigator.clipboard.writeText(text).then(() => showToast("已复制到剪贴板"));
      }
    });
  };

  const handleSpeak = (text: string, audioUrl?: string) => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play().catch(() => speakBrowser(text || query));
    } else {
      speakBrowser(text || query);
    }
  };

  const speakBrowser = (text: string) => {
    if (!window.speechSynthesis || !text) return;
    const ut = new SpeechSynthesisUtterance(text);
    ut.lang = toLang;
    window.speechSynthesis.speak(ut);
  };

  const handlePasteClipboard = () => {
    callGo("AppBridge.GetClipboardText").then((clip: string) => {
      if (clip) {
        setQuery(clip.trim());
        executeSearch(clip.trim(), fromLang, toLang);
      } else {
        showToast("剪贴板内容为空");
      }
    });
  };

  const handleTriggerOCR = () => {
    setIsOcrLoading(true);
    callGo("AppBridge.TriggerOCR", false)
      .then(() => {
        setIsOcrLoading(false);
        // The backend delivers the recognized text through __easydict_query.
      })
      .catch((err) => {
        setIsOcrLoading(false);
        showToast("OCR 识别失败: " + err);
      });
  };

  const togglePin = () => {
    const next = !isPinned;
    callGo("AppBridge.SetAlwaysOnTop", next).then(() => {
      setIsPinned(next);
      showToast(next ? "窗口已置顶" : "已取消置顶");
    });
  };

  const handleSaveConfig = (newCfg: AppConfig) => {
    callGo("AppBridge.SaveConfig", newCfg).then((ok: boolean) => {
      if (ok) {
        const refreshQuery = translationSettingsChanged(configRef.current, newCfg);
        configRef.current = newCfg;
        setConfig(newCfg);
        applyTheme(newCfg.theme);
        showToast("设置已保存");
        if (refreshQuery && query.trim()) executeSearch(query.trim());
      }
    });
  };

  const swapLang = () => {
    const curFrom = fromLang;
    const curTo = toLang;
    if (curFrom !== "auto") {
      setFromLang(curTo);
      setToLang(curFrom);
      if (query.trim()) executeSearch(query.trim(), curTo, curFrom);
    } else {
      setFromLang(curTo);
      setToLang("en");
      if (query.trim()) executeSearch(query.trim(), curTo, "en");
    }
  };

  const filteredResults =
    activeTab === "all"
      ? results
      : results.filter((r) => r.service_id === activeTab);

  return (
    <div className="h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans">
      {/* Header */}
      <header className="p-3 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md sticky top-0 z-10 space-y-2">
        {/* Search Bar with Base UI Input */}
        <div className="relative flex items-center">
          <Search className="absolute left-3 w-4 h-4 text-zinc-400 pointer-events-none" />
          <Input
            ref={inputRef}
            id="query-input"
            type="text"
            value={query}
            onChange={(e) => {
              queryVersion.current++;
              setQuery(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") executeSearch(query);
              if (e.key === "Escape") {
                if (query) {
                  setQuery("");
                  executeSearch("");
                } else {
                  callGo("AppBridge.HideWindow");
                }
              }
            }}
            placeholder="输入单词、短语或句子... (快捷键 Alt+A 聚焦)"
            className="pl-9 pr-16 h-10 text-sm rounded-lg bg-zinc-50 dark:bg-zinc-900/90 border-zinc-200 dark:border-zinc-800 focus-visible:ring-2 focus-visible:ring-blue-500 shadow-xs"
          />
          <div className="absolute right-2 flex items-center gap-1">
            {query && (
              <Button
                variant="ghost"
                size="icon"
                aria-label="清空输入"
                className="h-6 w-6 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                onClick={() => {
                  setQuery("");
                  executeSearch("");
                  inputRef.current?.focus();
                }}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
            <Button
              id="search-btn"
              size="sm"
              className="h-7 px-2.5 text-xs rounded-md shadow-none font-medium"
              onClick={() => executeSearch(query)}
            >
              翻译
            </Button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <Select
              aria-label="源语言"
              items={[
                { value: "auto", label: "自动识别" },
                { value: "en", label: "英语 (en)" },
                { value: "zh-CN", label: "简体中文 (zh-CN)" },
                { value: "zh-TW", label: "繁体中文 (zh-TW)" },
                { value: "ja", label: "日语 (ja)" },
                { value: "ko", label: "韩语 (ko)" },
                { value: "fr", label: "法语 (fr)" },
                { value: "de", label: "德语 (de)" },
              ]}
              value={fromLang}
              onValueChange={(value) => {
                setFromLang(value);
                if (query.trim()) executeSearch(query, value, toLang);
              }}
            />

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-zinc-500"
              onClick={swapLang}
              title="交换语言"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
            </Button>

            <Select
              aria-label="目标语言"
              items={[
                { value: "zh-CN", label: "简体中文 (zh-CN)" },
                { value: "zh-TW", label: "繁体中文 (zh-TW)" },
                { value: "en", label: "英语 (en)" },
                { value: "ja", label: "日语 (ja)" },
                { value: "ko", label: "韩语 (ko)" },
                { value: "fr", label: "法语 (fr)" },
                { value: "de", label: "德语 (de)" },
              ]}
              value={toLang}
              onValueChange={(value) => {
                setToLang(value);
                if (query.trim()) executeSearch(query, fromLang, value);
              }}
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs gap-1 text-zinc-600 dark:text-zinc-300 rounded-full"
              onClick={handlePasteClipboard}
              title="读取剪贴板并查询"
            >
              <ClipboardCopy className="w-3 h-3" />
              剪贴板
            </Button>

            <Button
              variant="outline"
              size="sm"
              disabled={isOcrLoading}
              className="h-7 px-2 text-xs gap-1 text-zinc-600 dark:text-zinc-300 rounded-full"
              onClick={handleTriggerOCR}
              title="截图并识别翻译 (Alt+S)"
            >
              <Crop className="w-3 h-3" />
              {isOcrLoading ? "截图中..." : "截图OCR"}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className={`h-7 w-7 ${
                isPinned
                  ? "text-blue-600 bg-blue-50 dark:bg-blue-950/40"
                  : "text-zinc-500"
              }`}
              onClick={togglePin}
              title={isPinned ? "取消置顶" : "置顶窗口"}
            >
              <Pin className="w-3.5 h-3.5" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2.5 text-xs gap-1.5 text-zinc-700 dark:text-zinc-200 rounded-full font-medium border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 shadow-2xs"
              onClick={() => setIsSettingsOpen(true)}
              title="偏好设置 (Ctrl+,)"
            >
              <Settings className="w-3.5 h-3.5 text-zinc-500" />
              设置
            </Button>
          </div>
        </div>
      </header>

      {/* Base UI Tabs Component */}
      <Tabs.Root
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as string)}
        className="flex flex-col flex-1 overflow-hidden"
      >
        <Tabs.List className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/60 dark:bg-zinc-900/60 text-xs">
          <div className="flex items-center gap-1 overflow-x-auto">
            {[
              { id: "all", label: "全部" },
              { id: "youdao", label: "有道词典" },
              { id: "bing", label: "Bing" },
              { id: "google", label: "Google" },
              { id: "ai", label: "AI 释义" },
              { id: "deepl", label: "DeepL" },
            ].map((tab) => (
              <Tabs.Tab
                key={tab.id}
                value={tab.id}
                className="px-2.5 py-1 rounded-md font-medium transition-colors duration-150 cursor-pointer text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 data-[selected]:bg-white dark:data-[selected]:bg-zinc-800 data-[selected]:text-blue-600 dark:data-[selected]:text-blue-400 data-[selected]:shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                {tab.label}
              </Tabs.Tab>
            ))}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSettingsOpen(true)}
            className="h-6 px-2 text-[11px] gap-1 text-zinc-500 hover:text-blue-600 dark:hover:text-blue-400"
          >
            <Settings className="w-3 h-3" />
            偏好设置
          </Button>
        </Tabs.List>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-3 space-y-3">
          {filteredResults.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-zinc-400 space-y-3">
              <Search className="w-10 h-10 opacity-30" />
              <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                查词与翻译功能已就绪
              </div>
              <div className="text-xs max-w-sm leading-relaxed text-zinc-500 dark:text-zinc-400 space-y-1.5 text-left bg-zinc-100/70 dark:bg-zinc-900/70 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <span>输入查词 (聚焦输入框)</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 font-mono text-[10px]">Alt + A</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span>划词翻译 (选中文本即查)</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 font-mono text-[10px]">Alt + D</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span>截图划选并翻译</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 font-mono text-[10px]">Alt + S</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span>静默截图 OCR (复制到剪贴板)</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 font-mono text-[10px]">Alt + Shift + S</kbd>
                </div>
                <div className="text-[11px] text-zinc-400 dark:text-zinc-500 pt-1 border-t border-zinc-200 dark:border-zinc-800">
                  ✨ 划选任意文本会自动在光标旁弹出悬浮小图标，点击图标即可翻译，无需再次点击翻译按钮。
                </div>
              </div>

              <div className="pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3.5 text-xs gap-1.5 rounded-lg border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100/60 dark:hover:bg-blue-900/50 font-medium"
                  onClick={() => setIsSettingsOpen(true)}
                >
                  <Settings className="w-3.5 h-3.5" />
                  打开偏好设置 (修改快捷键 / 开关划词悬浮)
                </Button>
              </div>
            </div>
          ) : (
            filteredResults.map((res) => (
              <ServiceCard
                key={res.service_id}
                result={res}
                onRefresh={handleRefreshSingle}
                onCopy={handleCopy}
                onSpeak={handleSpeak}
              />
            ))
          )}
        </main>
      </Tabs.Root>

      {/* Settings Modal (Base UI Dialog + Checkbox + Switch) */}
      {config && (
        <SettingsModal
          open={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          config={config}
          onSave={handleSaveConfig}
        />
      )}

    </div>
  );
}
