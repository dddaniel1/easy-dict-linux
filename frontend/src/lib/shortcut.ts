const NAMED: Record<string, string> = {
  " ": "Space",
  space: "Space",
  escape: "Escape",
  esc: "Escape",
  enter: "Enter",
  return: "Enter",
  tab: "Tab",
  backspace: "Backspace",
  delete: "Delete",
  del: "Delete",
  insert: "Insert",
  home: "Home",
  end: "End",
  pageup: "PageUp",
  pagedown: "PageDown",
  arrowup: "Up",
  arrowdown: "Down",
  arrowleft: "Left",
  arrowright: "Right",
  up: "Up",
  down: "Down",
  left: "Left",
  right: "Right",
  "+": "Plus",
};

export function shortcutFromEvent(event: KeyboardEvent): string | null {
  const key = event.key;
  if (["Control", "Alt", "Shift", "Meta", "OS"].includes(key)) return null;

  const modifiers: string[] = [];
  if (event.metaKey) modifiers.push("Super");
  if (event.ctrlKey) modifiers.push("Ctrl");
  if (event.altKey) modifiers.push("Alt");
  if (event.shiftKey) modifiers.push("Shift");

  let normalized = NAMED[key.toLowerCase()];
  if (!normalized && /^F([1-9]|1[0-9]|2[0-4])$/.test(key)) normalized = key.toUpperCase();
  if (!normalized && key.length === 1) normalized = key.toUpperCase();
  if (!normalized) return null;

  const functionKey = /^F([1-9]|1[0-9]|2[0-4])$/.test(normalized);
  if (modifiers.length === 0 && !functionKey) return null;
  return [...modifiers, normalized].join("+");
}

export function shortcutParts(value: string): string[] {
  return value.split("+").filter(Boolean);
}

export function validateShortcut(value: string): string | null {
  if (!value.trim()) return "请录制一个快捷键";
  const parts = shortcutParts(value);
  const modifiers = new Set(parts.slice(0, -1));
  const key = parts.at(-1) || "";
  if (!/^F([1-9]|1[0-9]|2[0-4])$/.test(key) && modifiers.size === 0) {
    return "快捷键需要包含 Ctrl、Alt、Shift 或 Super";
  }
  if (!["Super", "Ctrl", "Alt", "Shift"].every((modifier) => !modifiers.has(modifier) || modifiers.size <= 4)) {
    return "快捷键格式无效";
  }
  return null;
}
