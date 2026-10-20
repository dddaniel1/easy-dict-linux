import React from "react";
import { AppConfig, SaveConfigResult, ShortcutStatus } from "@/types";
import { Dialog, Checkbox, Switch } from "@base-ui/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { normalizeShortcut, shortcutFromEvent, validateShortcut } from "@/lib/shortcut";
import {
  X,
  Check,
  Boxes,
  Keyboard,
  MousePointer2,
  Sparkles,
  Languages,
  Palette,
  AlertCircle,
  CheckCircle2,
  CircleDot,
  LoaderCircle,
} from "lucide-react";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  config: AppConfig;
  onSave: (newCfg: AppConfig) => Promise<SaveConfigResult>;
  loadShortcutStatuses: () => Promise<ShortcutStatus[]>;
}

type SectionID = "services" | "shortcuts" | "selection" | "ai" | "deepl" | "appearance";

const SECTIONS: {
  id: SectionID;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "services", label: "翻译服务", hint: "启用的引擎", icon: Boxes },
  { id: "shortcuts", label: "快捷键", hint: "录制与冲突", icon: Keyboard },
  { id: "selection", label: "划词与交互", hint: "选区与 OCR", icon: MousePointer2 },
  { id: "ai", label: "AI 模型", hint: "DeepSeek / Ollama", icon: Sparkles },
  { id: "deepl", label: "DeepL", hint: "官方 API", icon: Languages },
  { id: "appearance", label: "外观", hint: "主题", icon: Palette },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  onClose,
  config,
  onSave,
  loadShortcutStatuses,
}) => {
  const [dirty, setDirty] = React.useState(false);
  const [showDiscard, setShowDiscard] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setDirty(false);
      setShowDiscard(false);
    }
  }, [open]);

  const requestClose = () => {
    if (dirty) {
      setShowDiscard(true);
      return;
    }
    onClose();
  };

  return (
    // The app scrolls inside <main>; locking the document again repaints the WebKit surface.
    <Dialog.Root
      modal="trap-focus"
      open={open}
      onOpenChange={(nextOpen, eventDetails) => {
        if (nextOpen) return;
        if (dirty) {
          eventDetails.cancel();
          setShowDiscard(true);
          return;
        }
        onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="settings-backdrop fixed inset-0 z-50 bg-black/60" />
        <Dialog.Viewport className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <SettingsContent
            config={config}
            onClose={onClose}
            onRequestClose={requestClose}
            onSave={onSave}
            loadShortcutStatuses={loadShortcutStatuses}
            dirty={dirty}
            onDirtyChange={setDirty}
            showDiscard={showDiscard}
            onShowDiscard={setShowDiscard}
          />
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

const SettingsContent: React.FC<Omit<SettingsModalProps, "open"> & {
  onRequestClose: () => void;
  dirty: boolean;
  onDirtyChange: (dirty: boolean) => void;
  showDiscard: boolean;
  onShowDiscard: (show: boolean) => void;
}> = ({
  onClose,
  onRequestClose,
  config,
  onSave,
  loadShortcutStatuses,
  dirty,
  onDirtyChange,
  showDiscard,
  onShowDiscard,
}) => {
  // Controls own their input state; editing one field does not redraw the whole dialog.
  const defaults = React.useRef(config).current;
  const form = React.useRef<AppConfig>({ ...defaults, enabled_services: [...defaults.enabled_services] });
  const [activeSection, setActiveSection] = React.useState<SectionID>("services");
  const [shortcuts, setShortcuts] = React.useState({
    shortcut_input: defaults.shortcut_input || "Alt+A",
    shortcut_selection: defaults.shortcut_selection || "Alt+D",
    shortcut_ocr: defaults.shortcut_ocr || "Alt+S",
    shortcut_ocr_silent: defaults.shortcut_ocr_silent || "Alt+Shift+S",
  });
  const [statuses, setStatuses] = React.useState<ShortcutStatus[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState("");

  React.useEffect(() => {
    loadShortcutStatuses().then(setStatuses).catch(() => setStatuses([]));
    // Statuses are read once when the dialog opens; saving updates them from
    // the SaveConfig result instead of triggering another render loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markDirty = () => {
    onDirtyChange(true);
    setSaveError("");
  };

  const setShortcut = (key: keyof typeof shortcuts, value: string) => {
    setShortcuts((current) => ({ ...current, [key]: value }));
    form.current[key] = value;
    markDirty();
  };

  const toggleService = (id: string, checked: boolean) => {
    const services = new Set(form.current.enabled_services);
    if (checked) services.add(id);
    else services.delete(id);
    form.current.enabled_services = [...services];
    markDirty();
  };

  const duplicateCounts = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const value of Object.values(shortcuts)) {
      const normalized = value.trim().toLowerCase();
      counts.set(normalized, (counts.get(normalized) || 0) + 1);
    }
    return counts;
  }, [shortcuts]);

  const shortcutErrors = React.useMemo(() => {
    const errors = new Map<string, string>();
    for (const [key, value] of Object.entries(shortcuts)) {
      const error = validateShortcut(value);
      if (error) errors.set(key, error);
    }
    return errors;
  }, [shortcuts]);

  const handleSave = async () => {
    if (saving) return;
    const hasDuplicate = Object.values(shortcuts).some(
      (value) => (duplicateCounts.get(value.trim().toLowerCase()) || 0) > 1
    );
    if (shortcutErrors.size > 0) {
      setSaveError("快捷键格式无效，请点击对应输入框重新录制。");
      setActiveSection("shortcuts");
      return;
    }
    if (hasDuplicate) {
      setSaveError("快捷键不能重复：请为每个功能录制不同的组合。");
      setActiveSection("shortcuts");
      return;
    }

    setSaving(true);
    setSaveError("");
    try {
      const result = await onSave({
        ...form.current,
        shortcut_input: normalizeShortcut(shortcuts.shortcut_input) || shortcuts.shortcut_input,
        shortcut_selection: normalizeShortcut(shortcuts.shortcut_selection) || shortcuts.shortcut_selection,
        shortcut_ocr: normalizeShortcut(shortcuts.shortcut_ocr) || shortcuts.shortcut_ocr,
        shortcut_ocr_silent: normalizeShortcut(shortcuts.shortcut_ocr_silent) || shortcuts.shortcut_ocr_silent,
      });
      setStatuses(result.shortcuts || []);
      if (!result.saved) {
        setSaveError(result.error || "设置保存失败，请重试。");
        return;
      }
      if (!result.ok) {
        const failed = result.shortcuts?.filter((item) => !item.ok) ?? [];
        setSaveError(
          failed.length
            ? "设置已保存，但部分快捷键没有生效。请根据下方提示修改后再次保存。"
            : result.error || "设置已保存，但部分快捷键没有生效。"
        );
        setActiveSection("shortcuts");
        return;
      }
      onDirtyChange(false);
      onClose();
    } catch (error) {
      setSaveError("设置保存失败：" + (error instanceof Error ? error.message : String(error)));
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      if (saving) return;
      onRequestClose();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      void handleSave();
    }
  };

  return (
    <Dialog.Popup
      onKeyDown={handleKeyDown}
      className="settings-popup flex h-[min(82vh,680px)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white text-zinc-900 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
    >
      <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3.5 dark:border-zinc-800">
        <div>
          <Dialog.Title className="text-base font-semibold">偏好设置</Dialog.Title>
          <div className="mt-0.5 text-[11px] text-zinc-400">Ctrl+Enter 保存 · Esc 取消</div>
        </div>
        <Dialog.Close
          aria-label="关闭设置"
          render={<Button variant="ghost" size="icon" className="h-7 w-7" disabled={saving} />}
          onClick={(event) => {
            event.preventBaseUIHandler();
            if (!saving) onRequestClose();
          }}
        >
          <X className="h-4 w-4" />
        </Dialog.Close>
      </div>

      <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
        <nav aria-label="设置分类" className="shrink-0 border-b border-zinc-200 bg-zinc-50/80 p-2 dark:border-zinc-800 dark:bg-zinc-950/30 sm:w-40 sm:border-b-0 sm:border-r sm:p-2.5">
          <div className="flex flex-wrap gap-1 sm:block sm:space-y-1">
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              const selected = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  aria-current={selected ? "page" : undefined}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 sm:w-full sm:gap-2 sm:px-2.5 sm:py-2 ${
                    selected
                      ? "bg-white text-blue-700 shadow-sm dark:bg-zinc-800 dark:text-blue-300"
                      : "text-zinc-600 hover:bg-white/70 dark:text-zinc-400 dark:hover:bg-zinc-800/60"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="min-w-0">
                    <span className="block whitespace-nowrap text-[11px] font-medium sm:truncate sm:text-xs">{section.label}</span>
                    <span className="hidden truncate text-[10px] text-zinc-400 sm:block">{section.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        <div className="min-w-0 flex-1 overflow-y-auto p-5">
          {activeSection === "services" && (
            <Section title="翻译服务" description="选择每次查询要并发展示的来源。词典结果会优先排列。">
              <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                {[
                  { id: "youdao", label: "有道词典", detail: "音标 · 词性 · 双语例句" },
                  { id: "bing", label: "Bing 词典 / 翻译", detail: "双解词典与整句翻译" },
                  { id: "google", label: "Google 翻译", detail: "多语言自动识别" },
                  { id: "ai", label: "AI 智能词典", detail: "结构化释义与译注" },
                  { id: "deepl", label: "DeepL", detail: "官方翻译 API" },
                ].map((service) => (
                  <label
                    key={service.id}
                    className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-zinc-200 p-3 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/60"
                  >
                    <Checkbox.Root
                      defaultChecked={defaults.enabled_services.includes(service.id)}
                      onCheckedChange={(checked) => toggleService(service.id, Boolean(checked))}
                      className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-zinc-300 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 data-[checked]:border-blue-600 data-[checked]:bg-blue-600 data-[checked]:text-white dark:border-zinc-700"
                    >
                      <Checkbox.Indicator><Check className="h-3 w-3 stroke-[3]" /></Checkbox.Indicator>
                    </Checkbox.Root>
                    <span>
                      <span className="block font-medium text-zinc-800 dark:text-zinc-200">{service.label}</span>
                      <span className="mt-0.5 block text-[10px] text-zinc-400">{service.detail}</span>
                    </span>
                  </label>
                ))}
              </div>
            </Section>
          )}

          {activeSection === "shortcuts" && (
            <Section
              title="全局快捷键"
              description="点击输入框后直接按组合键录制。快捷键会在保存时重新注册；若 Wayland 弹出系统授权，请选择允许。"
            >
              <div className="space-y-2.5">
                <ShortcutField
                  id="shortcut_input"
                  label="输入查词"
                  description="打开主窗口并聚焦输入框"
                  value={shortcuts.shortcut_input}
                  onChange={(value) => setShortcut("shortcut_input", value)}
                  status={statuses.find((item) => item.id === "shortcut_input")}
                  duplicate={(duplicateCounts.get(shortcuts.shortcut_input.trim().toLowerCase()) || 0) > 1}
                  error={shortcutErrors.get("shortcut_input")}
                />
                <ShortcutField
                  id="shortcut_selection"
                  label="划词翻译"
                  description="读取 PRIMARY 选区并打开划词浮窗"
                  value={shortcuts.shortcut_selection}
                  onChange={(value) => setShortcut("shortcut_selection", value)}
                  status={statuses.find((item) => item.id === "shortcut_selection")}
                  duplicate={(duplicateCounts.get(shortcuts.shortcut_selection.trim().toLowerCase()) || 0) > 1}
                  error={shortcutErrors.get("shortcut_selection")}
                />
                <ShortcutField
                  id="shortcut_ocr"
                  label="截图翻译"
                  description="框选屏幕区域，识别后翻译"
                  value={shortcuts.shortcut_ocr}
                  onChange={(value) => setShortcut("shortcut_ocr", value)}
                  status={statuses.find((item) => item.id === "shortcut_ocr")}
                  duplicate={(duplicateCounts.get(shortcuts.shortcut_ocr.trim().toLowerCase()) || 0) > 1}
                  error={shortcutErrors.get("shortcut_ocr")}
                />
                <ShortcutField
                  id="shortcut_ocr_silent"
                  label="静默截图 OCR"
                  description="识别后直接复制，不打开主窗口"
                  value={shortcuts.shortcut_ocr_silent}
                  onChange={(value) => setShortcut("shortcut_ocr_silent", value)}
                  status={statuses.find((item) => item.id === "shortcut_ocr_silent")}
                  duplicate={(duplicateCounts.get(shortcuts.shortcut_ocr_silent.trim().toLowerCase()) || 0) > 1}
                  error={shortcutErrors.get("shortcut_ocr_silent")}
                />
              </div>

              <div className="mt-4 rounded-xl border border-amber-200/70 bg-amber-50/70 p-3 text-[11px] leading-relaxed text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/25 dark:text-amber-300">
                <div className="font-semibold">应用注册与窗口管理器绑定请二选一</div>
                <div className="mt-1">
                  Hyprland、Sway 或 i3 已经绑定同名按键时，再在应用内注册会重复触发。保留应用内快捷键，或删除桌面配置中的
                  <code className="mx-1 rounded bg-amber-100 px-1 py-0.5 font-mono dark:bg-amber-950">easydict --input</code>
                  等绑定；不要两处同时启用。
                </div>
              </div>
            </Section>
          )}

          {activeSection === "selection" && (
            <Section title="划词与交互" description="控制划词悬浮按钮和启动时的剪贴板行为。">
              <div className="space-y-2.5">
                <ToggleRow
                  checked={defaults.auto_show_floating_button}
                  onChange={(checked) => {
                    form.current.auto_show_floating_button = checked;
                    markDirty();
                  }}
                  title="划词自动弹出悬浮图标"
                  description="鼠标划选文字后，在光标旁显示翻译图标。读取的是 PRIMARY 选区。"
                />
                <ToggleRow
                  checked={defaults.auto_query_clipboard}
                  onChange={(checked) => {
                    form.current.auto_query_clipboard = checked;
                    markDirty();
                  }}
                  title="启动时自动查询剪贴板"
                  description="读取 Ctrl+C 写入的 CLIPBOARD；不会读取鼠标划选的 PRIMARY 内容。"
                />
              </div>
              <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 text-[11px] leading-relaxed text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/30 dark:text-zinc-400">
                <div className="font-medium text-zinc-700 dark:text-zinc-300">两个“剪贴板”并不相同</div>
                <div className="mt-1">
                  CLIPBOARD 是 Ctrl+C / Ctrl+V 使用的内容；PRIMARY 是鼠标划选后、中键粘贴使用的内容。工具栏的“剪贴板 CLIPBOARD”只读取前者。
                </div>
              </div>
            </Section>
          )}

          {activeSection === "ai" && (
            <Section title="AI 模型" description="兼容 DeepSeek、OpenAI 与本地 Ollama 等 OpenAI 风格接口。">
              <ToggleRow
                checked={defaults.ai_enabled}
                onChange={(checked) => {
                  form.current.ai_enabled = checked;
                  markDirty();
                }}
                title="启用 AI 词典与翻译"
                description="单词查询返回结构化释义；整句查询返回自然翻译与译注。"
              />
              <div className="mt-4 space-y-3">
                <Field label="API Base URL" htmlFor="ai_base_url">
                  <Input id="ai_base_url"
                    defaultValue={defaults.ai_base_url}
                    onChange={(e) => {
                      form.current.ai_base_url = e.target.value;
                      markDirty();
                    }}
                    placeholder="https://api.deepseek.com/v1 或 http://localhost:11434/v1"
                    className="mt-1 text-xs"
                  />
                </Field>
                <Field label="API Key" htmlFor="ai_api_key">
                  <Input id="ai_api_key"
                    type="password"
                    defaultValue={defaults.ai_api_key}
                    onChange={(e) => {
                      form.current.ai_api_key = e.target.value;
                      markDirty();
                    }}
                    placeholder="sk-...（本地 Ollama 可留空）"
                    className="mt-1 font-mono text-xs"
                  />
                </Field>
                <Field label="模型名称" htmlFor="ai_model">
                  <Input id="ai_model"
                    defaultValue={defaults.ai_model}
                    onChange={(e) => {
                      form.current.ai_model = e.target.value;
                      markDirty();
                    }}
                    placeholder="deepseek-chat / gpt-4o-mini / qwen2.5:7b"
                    className="mt-1 text-xs"
                  />
                </Field>
              </div>
            </Section>
          )}

          {activeSection === "deepl" && (
            <Section title="DeepL" description="使用 DeepL 官方 API 进行高质量整句翻译。">
              <ToggleRow
                checked={defaults.deepl_enabled}
                onChange={(checked) => {
                  form.current.deepl_enabled = checked;
                  markDirty();
                }}
                title="启用 DeepL 翻译"
                description="需要有效的 Authentication Key。"
              />
              <div className="mt-4">
                <Field label="Authentication Key" htmlFor="deepl_auth_key">
                  <Input id="deepl_auth_key"
                    type="password"
                    defaultValue={defaults.deepl_auth_key}
                    onChange={(e) => {
                      form.current.deepl_auth_key = e.target.value;
                      markDirty();
                    }}
                    placeholder="DeepL Auth Key"
                    className="mt-1 font-mono text-xs"
                  />
                </Field>
              </div>
            </Section>
          )}

          {activeSection === "appearance" && (
            <Section title="外观" description="主题会立即应用，并在下次启动时保留。">
              <Field label="主题" htmlFor="theme-select">
                <Select
                  aria-label="主题"
                  items={[
                    { value: "auto", label: "跟随系统" },
                    { value: "light", label: "浅色模式" },
                    { value: "dark", label: "深色模式" },
                  ]}
                  defaultValue={defaults.theme}
                  onValueChange={(value) => {
                    form.current.theme = value as AppConfig["theme"];
                    markDirty();
                  }}
                  className="mt-1 h-9 w-full dark:bg-zinc-800"
                />
              </Field>
            </Section>
          )}
        </div>
      </div>

      <div className="border-t border-zinc-200 bg-zinc-50/80 px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900/80">
        {showDiscard && (
          <div role="alert" className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800 dark:border-amber-950 dark:bg-amber-950/30 dark:text-amber-300">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0 flex-1">还有未保存的修改，确定放弃吗？</span>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={() => onShowDiscard(false)}>继续编辑</Button>
            <Button variant="outline" size="sm" className="h-6 px-2 text-[11px]" onClick={onClose}>放弃修改</Button>
          </div>
        )}
        {saveError && (
          <div className="mb-2 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700 dark:border-red-950 dark:bg-red-950/30 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{saveError}</span>
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <span className="hidden text-[11px] text-zinc-400 sm:block">保存后立即应用；快捷键会重新注册。</span>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={onRequestClose} disabled={saving}>取消</Button>
            <Button size="sm" onClick={() => void handleSave()} disabled={saving} className="gap-1.5">
              {saving && <LoaderCircle className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" />}
              {saving ? "保存中..." : "保存设置"}
            </Button>
          </div>
        </div>
      </div>
    </Dialog.Popup>
  );
};

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="mt-1 mb-4 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">{description}</p>
      {children}
    </section>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{label}</label>
      {children}
    </div>
  );
}

function ToggleRow({
  checked,
  onChange,
  title,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  title: string;
  description: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 p-3 text-xs dark:border-zinc-800">
      <Switch.Root
        defaultChecked={checked}
        onCheckedChange={(next) => onChange(Boolean(next))}
        className="relative mt-0.5 inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-zinc-200 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 data-[checked]:bg-blue-600 dark:bg-zinc-700"
      >
        <Switch.Thumb className="pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform motion-reduce:transition-none data-[checked]:translate-x-4" />
      </Switch.Root>
      <span>
        <span className="block font-medium text-zinc-800 dark:text-zinc-200">{title}</span>
        <span className="mt-0.5 block text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">{description}</span>
      </span>
    </label>
  );
}

function ShortcutField({
  id,
  label,
  description,
  value,
  onChange,
  status,
  duplicate,
  error,
}: {
  id: string;
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  status?: ShortcutStatus;
  duplicate: boolean;
  error?: string;
}) {
  const [recording, setRecording] = React.useState(false);
  const current = status?.accelerator?.toLowerCase() === value.toLowerCase() ? status : undefined;
  const invalid = Boolean(error) || duplicate || current?.source === "error";
  const warning = current?.source === "desktop";

  return (
    <div className={`rounded-xl border p-3 transition-colors ${
      invalid
        ? "border-red-200 bg-red-50/40 dark:border-red-950 dark:bg-red-950/20"
        : warning
          ? "border-amber-200 bg-amber-50/40 dark:border-amber-950 dark:bg-amber-950/20"
          : "border-zinc-200 dark:border-zinc-800"
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <label htmlFor={id} className="text-xs font-medium text-zinc-800 dark:text-zinc-200">{label}</label>
          <div className="mt-0.5 text-[10px] text-zinc-400">{description}</div>
        </div>
        <div className="w-48 shrink-0">
          <Input
            id={id}
            readOnly
            value={recording ? "请按下组合键…" : value}
            onFocus={() => setRecording(true)}
            onBlur={() => setRecording(false)}
            onKeyDown={(event) => {
              event.stopPropagation();
              if (event.key === "Escape") {
                event.preventDefault();
                setRecording(false);
                (event.currentTarget as HTMLInputElement).blur();
                return;
              }
              const shortcut = shortcutFromEvent(event.nativeEvent);
              if (shortcut) {
                event.preventDefault();
                onChange(shortcut);
                setRecording(false);
                (event.currentTarget as HTMLInputElement).blur();
              }
            }}
            aria-invalid={invalid}
            aria-describedby={`${id}-status`}
            className={`h-8 cursor-pointer text-center font-mono text-xs font-semibold ${
              recording ? "ring-2 ring-blue-400" : ""
            }`}
          />
        </div>
      </div>
      <div id={`${id}-status`} className={`mt-2 flex items-start gap-1.5 text-[10px] ${
        invalid
          ? "text-red-600 dark:text-red-400"
          : warning
            ? "text-amber-700 dark:text-amber-400"
            : "text-zinc-400"
      }`}>
        {invalid ? (
          <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
        ) : warning ? (
          <CircleDot className="mt-0.5 h-3 w-3 shrink-0" />
        ) : current?.ok ? (
          <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
        ) : (
          <CircleDot className="mt-0.5 h-3 w-3 shrink-0" />
        )}
        <span>
          {duplicate
            ? "与其他功能使用了相同快捷键"
            : error
              ? error
              : current?.message
                ? current.message
                : current?.ok
                  ? "已注册，保存其他设置时也会保留"
                  : "保存后重新注册；点击输入框可直接录制"}
        </span>
      </div>
    </div>
  );
}
