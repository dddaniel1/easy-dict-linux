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

const MODIFIER_ORDER = ["Super", "Ctrl", "Alt", "Shift"];

function isFunctionKey(key: string): boolean {
  return /^F([1-9]|1[0-9]|2[0-4])$/.test(key);
}

function canonicalKey(key: string): string | null {
  const named = NAMED[key.toLowerCase()];
  if (named) return named;
  if (isFunctionKey(key)) return key.toUpperCase();
  if (key.length === 1) return key.toUpperCase();
  return null;
}

export function shortcutFromEvent(event: KeyboardEvent): string | null {
  const key = event.key;
  if (["Control", "Alt", "Shift", "Meta", "OS"].includes(key)) return null;

  const modifiers: string[] = [];
  if (event.metaKey) modifiers.push("Super");
  if (event.ctrlKey) modifiers.push("Ctrl");
  if (event.altKey) modifiers.push("Alt");
  if (event.shiftKey) modifiers.push("Shift");

  const normalized = canonicalKey(key);
  if (!normalized) return null;

  if (modifiers.length === 0 && !isFunctionKey(normalized)) return null;
  return [...modifiers, normalized].join("+");
}

export function shortcutParts(value: string): string[] {
  return value.split("+").filter(Boolean);
}

// Produce the same canonical form as the Go registration code. This keeps
// validation, duplicate checks, and saved values consistent.
export function normalizeShortcut(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parts = shortcutParts(trimmed);
  if (parts.length === 1) {
    const key = canonicalKey(parts[0]);
    return key && isFunctionKey(key) ? key : null;
  }

  const modifiers = new Set<string>();
  for (const part of parts.slice(0, -1)) {
    const lower = part.toLowerCase();
    if (["ctrl", "control", "cmdorctrl", "commandorcontrol"].includes(lower)) modifiers.add("Ctrl");
    else if (["alt", "option", "altgr"].includes(lower)) modifiers.add("Alt");
    else if (lower === "shift") modifiers.add("Shift");
    else if (["super", "meta", "cmd", "command", "win"].includes(lower)) modifiers.add("Super");
    else return null;
  }
  const key = canonicalKey(parts.at(-1) || "");
  if (!key || modifiers.size === 0) return null;
  return [...MODIFIER_ORDER.filter((modifier) => modifiers.has(modifier)), key].join("+");
}

export function validateShortcut(value: string): string | null {
  if (!value.trim()) return "请录制一个快捷键";
  return normalizeShortcut(value) ? null : "快捷键格式无效，需要修饰键加一个按键，或使用 F1–F24";
}
