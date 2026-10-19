import React from "react";
import { AppConfig } from "@/types";
import { Dialog, Checkbox, Switch } from "@base-ui/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { X, Check } from "lucide-react";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  config: AppConfig;
  onSave: (newCfg: AppConfig) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  ...props
}) => (
  // The app scrolls inside <main>; locking the document again repaints the WebKit surface.
  <Dialog.Root modal="trap-focus" open={open} onOpenChange={(nextOpen) => !nextOpen && props.onClose()}>
    <Dialog.Portal>
      <Dialog.Backdrop className="settings-backdrop fixed inset-0 z-50 bg-black/60" />
      <Dialog.Viewport className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <SettingsContent {...props} />
      </Dialog.Viewport>
    </Dialog.Portal>
  </Dialog.Root>
);

const SettingsContent: React.FC<Omit<SettingsModalProps, "open">> = ({
  onClose,
  config,
  onSave,
}) => {
  // Controls own their input state; editing one field does not redraw the whole dialog.
  const defaults = React.useRef(config).current;
  const form = React.useRef<AppConfig>({ ...defaults, enabled_services: [...defaults.enabled_services] });

  const toggleService = (id: string, checked: boolean) => {
    const services = new Set(form.current.enabled_services);
    if (checked) services.add(id);
    else services.delete(id);
    form.current.enabled_services = [...services];
  };

  const handleSave = () => {
    onSave({ ...form.current });
    onClose();
  };

  return (
    <Dialog.Popup className="settings-popup w-full max-w-lg rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 max-h-[85vh] flex flex-col overflow-hidden text-zinc-900 dark:text-zinc-100">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3.5 dark:border-zinc-800">
        <Dialog.Title className="text-base font-semibold">
          偏好设置 (Settings)
        </Dialog.Title>
        <Dialog.Close aria-label="关闭设置" render={<Button variant="ghost" size="icon" className="h-7 w-7" />}>
          <X className="h-4 w-4" />
        </Dialog.Close>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 text-sm">
        {/* Services */}
        <div>
          <label className="font-semibold block mb-2">启用的翻译与词典服务</label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              { id: "youdao", label: "有道词典 (含音标/例句)" },
              { id: "bing", label: "Bing 词典 / 翻译" },
              { id: "google", label: "Google 翻译" },
              { id: "ai", label: "AI 智能词典与翻译" },
              { id: "deepl", label: "DeepL 翻译" },
            ].map((svc) => (
              <label
                key={svc.id}
                className="flex items-center gap-2.5 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 cursor-pointer transition-colors"
              >
                <Checkbox.Root
                  defaultChecked={defaults.enabled_services.includes(svc.id)}
                  onCheckedChange={(checked) => toggleService(svc.id, checked)}
                  className="flex h-4 w-4 items-center justify-center rounded border border-zinc-300 dark:border-zinc-700 data-[checked]:bg-blue-600 data-[checked]:border-blue-600 data-[checked]:text-white transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                >
                  <Checkbox.Indicator>
                    <Check className="h-3 w-3 stroke-[3]" />
                  </Checkbox.Indicator>
                </Checkbox.Root>
                <span>{svc.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Shortcuts Configuration */}
        <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800 space-y-3">
          <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center justify-between">
            <span>全局快捷键 (Shortcuts)</span>
            <span className="text-[11px] font-normal text-blue-600 dark:text-blue-400">已生效</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
              <label htmlFor="shortcut_input" className="text-zinc-700 dark:text-zinc-300 font-medium block mb-1">
                输入查词
              </label>
              <Input id="shortcut_input"
                defaultValue={defaults.shortcut_input || "Alt+A"}
                onChange={(e) => (form.current.shortcut_input = e.target.value)}
                placeholder="Alt+A"
                className="h-8 text-xs font-mono font-medium"
              />
              <div className="text-[10px] text-zinc-400 mt-1">默认 ⌥ + A，聚焦输入框</div>
            </div>

            <div className="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
              <label htmlFor="shortcut_selection" className="text-zinc-700 dark:text-zinc-300 font-medium block mb-1">
                划词翻译
              </label>
              <Input id="shortcut_selection"
                defaultValue={defaults.shortcut_selection || "Alt+D"}
                onChange={(e) => (form.current.shortcut_selection = e.target.value)}
                placeholder="Alt+D"
                className="h-8 text-xs font-mono font-medium"
              />
              <div className="text-[10px] text-zinc-400 mt-1">默认 ⌥ + D，选中文本即查</div>
            </div>

            <div className="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
              <label htmlFor="shortcut_ocr" className="text-zinc-700 dark:text-zinc-300 font-medium block mb-1">
                截图翻译
              </label>
              <Input id="shortcut_ocr"
                defaultValue={defaults.shortcut_ocr || "Alt+S"}
                onChange={(e) => (form.current.shortcut_ocr = e.target.value)}
                placeholder="Alt+S"
                className="h-8 text-xs font-mono font-medium"
              />
              <div className="text-[10px] text-zinc-400 mt-1">默认 ⌥ + S，区域划选 OCR</div>
            </div>

            <div className="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
              <label htmlFor="shortcut_ocr_silent" className="text-zinc-700 dark:text-zinc-300 font-medium block mb-1">
                静默截图 OCR
              </label>
              <Input id="shortcut_ocr_silent"
                defaultValue={defaults.shortcut_ocr_silent || "Alt+Shift+S"}
                onChange={(e) => (form.current.shortcut_ocr_silent = e.target.value)}
                placeholder="Alt+Shift+S"
                className="h-8 text-xs font-mono font-medium"
              />
              <div className="text-[10px] text-zinc-400 mt-1">默认 ⌥ + ⇧ + S，复制不弹窗</div>
            </div>
          </div>
          <p className="text-[11px] text-zinc-500 leading-relaxed">
            提示：快捷键亦支持在 Hyprland、Sway、i3 等窗口管理器配置文件中直接绑定命令 <code className="px-1 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 font-mono text-[10px]">easydict --input</code> / <code className="px-1 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 font-mono text-[10px]">easydict --selection</code> / <code className="px-1 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 font-mono text-[10px]">easydict --ocr</code>。
          </p>
        </div>

        {/* Selection & OCR Floating Behavior */}
        <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800 space-y-3">
          <div className="font-semibold text-zinc-900 dark:text-zinc-100">划词与交互行为</div>

          <label className="flex items-start gap-3 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 cursor-pointer text-xs">
            <Switch.Root
              defaultChecked={defaults.auto_show_floating_button}
              onCheckedChange={(checked) =>
                (form.current.auto_show_floating_button = Boolean(checked))
              }
              className="outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-zinc-200 dark:bg-zinc-700 transition-colors data-[checked]:bg-blue-600 mt-0.5"
            >
              <Switch.Thumb className="pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform motion-reduce:transition-none data-[checked]:translate-x-4" />
            </Switch.Root>
            <div>
              <div className="font-medium text-zinc-900 dark:text-zinc-100">划词自动弹出悬浮图标</div>
              <div className="text-[11px] text-zinc-500 mt-0.5">
                在任意软件（网页/PDF/终端/编辑器）中鼠标划选文字后，光标旁自动浮现微型图标，点击图标立即翻译，无需在主窗口再次点击翻译。
              </div>
            </div>
          </label>

          <label className="flex items-start gap-3 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 cursor-pointer text-xs">
            <Switch.Root
              defaultChecked={defaults.auto_query_clipboard}
              onCheckedChange={(checked) =>
                (form.current.auto_query_clipboard = Boolean(checked))
              }
              className="outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-zinc-200 dark:bg-zinc-700 transition-colors data-[checked]:bg-blue-600 mt-0.5"
            >
              <Switch.Thumb className="pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform motion-reduce:transition-none data-[checked]:translate-x-4" />
            </Switch.Root>
            <div>
              <div className="font-medium text-zinc-900 dark:text-zinc-100">启动时自动查询剪贴板</div>
              <div className="text-[11px] text-zinc-500 mt-0.5">
                启动应用时查询剪贴板内容；使用 Alt+D 单独翻译当前选中文字。
              </div>
            </div>
          </label>
        </div>

        {/* AI Settings */}
        <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800 space-y-3">
          <label className="flex items-center gap-2.5 font-semibold cursor-pointer">
            <Switch.Root
              defaultChecked={defaults.ai_enabled}
              onCheckedChange={(checked) => (form.current.ai_enabled = checked)}
              className="outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-zinc-200 dark:bg-zinc-700 transition-colors data-[checked]:bg-blue-600"
            >
              <Switch.Thumb className="pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform motion-reduce:transition-none data-[checked]:translate-x-4" />
            </Switch.Root>
            <span>启用 AI 词典与翻译 (DeepSeek / OpenAI / Ollama)</span>
          </label>

          <div className="space-y-2">
            <div>
              <label htmlFor="ai_base_url" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                API Base URL
              </label>
              <Input id="ai_base_url"
                defaultValue={defaults.ai_base_url}
                onChange={(e) => (form.current.ai_base_url = e.target.value)}
                placeholder="https://api.deepseek.com/v1 或 http://localhost:11434/v1"
                className="mt-1 text-xs"
              />
            </div>

            <div>
              <label htmlFor="ai_api_key" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                API Key
              </label>
              <Input id="ai_api_key"
                type="password"
                defaultValue={defaults.ai_api_key}
                onChange={(e) => (form.current.ai_api_key = e.target.value)}
                placeholder="sk-..."
                className="mt-1 text-xs font-mono"
              />
            </div>

            <div>
              <label htmlFor="ai_model" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                模型名称 (Model)
              </label>
              <Input id="ai_model"
                defaultValue={defaults.ai_model}
                onChange={(e) => (form.current.ai_model = e.target.value)}
                placeholder="deepseek-chat 或 gpt-4o-mini 或 qwen2.5:7b"
                className="mt-1 text-xs"
              />
            </div>
          </div>
        </div>

        {/* DeepL Settings */}
        <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800 space-y-3">
          <label className="flex items-center gap-2.5 font-semibold cursor-pointer">
            <Switch.Root
              defaultChecked={defaults.deepl_enabled}
              onCheckedChange={(checked) => (form.current.deepl_enabled = checked)}
              className="outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-zinc-200 dark:bg-zinc-700 transition-colors data-[checked]:bg-blue-600"
            >
              <Switch.Thumb className="pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform motion-reduce:transition-none data-[checked]:translate-x-4" />
            </Switch.Root>
            <span>启用 DeepL 翻译 API</span>
          </label>
          <div>
            <label htmlFor="deepl_auth_key" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              DeepL Authentication Key
            </label>
            <Input id="deepl_auth_key"
              type="password"
              defaultValue={defaults.deepl_auth_key}
              onChange={(e) => (form.current.deepl_auth_key = e.target.value)}
              placeholder="DeepL Auth Key"
              className="mt-1 text-xs font-mono"
            />
          </div>
        </div>

        {/* Theme */}
        <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <div id="theme-label" className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block mb-1">
            外观主题
          </div>
          <Select
            aria-labelledby="theme-label"
            items={[
              { value: "auto", label: "跟随系统主题 (Auto)" },
              { value: "light", label: "浅色模式 (Light)" },
              { value: "dark", label: "深色模式 (Dark)" },
            ]}
            defaultValue={defaults.theme}
            onValueChange={(value) => (form.current.theme = value)}
            className="w-full h-8 dark:bg-zinc-800"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-2 border-t border-zinc-200 px-5 py-3 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
        <Button variant="outline" size="sm" onClick={onClose}>
          取消
        </Button>
        <Button size="sm" onClick={handleSave}>
          保存设置
        </Button>
      </div>
    </Dialog.Popup>
  );
};
