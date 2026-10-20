import test from "node:test";
import assert from "node:assert/strict";
import { normalizeShortcut, shortcutFromEvent, shortcutParts, validateShortcut } from "../src/lib/shortcut.ts";

function keyEvent(key: string, options: Partial<KeyboardEvent> = {}) {
  return { key, ctrlKey: false, altKey: false, shiftKey: false, metaKey: false, ...options } as KeyboardEvent;
}

test("shortcut recording normalizes modifiers and rejects plain letters", () => {
  assert.equal(shortcutFromEvent(keyEvent("a", { altKey: true })), "Alt+A");
  assert.equal(shortcutFromEvent(keyEvent("s", { altKey: true, shiftKey: true })), "Alt+Shift+S");
  assert.equal(shortcutFromEvent(keyEvent("F8")), "F8");
  assert.equal(shortcutFromEvent(keyEvent("a")), null);
  assert.equal(shortcutFromEvent(keyEvent("Control", { ctrlKey: true })), null);
});

test("shortcut validation and display are readable", () => {
  assert.equal(validateShortcut("Alt+A"), null);
  assert.match(validateShortcut("A") || "", /修饰键/);
  assert.match(validateShortcut("Ctrl+Alt") || "", /格式无效/);
  assert.match(validateShortcut("Ctrl+Bogus") || "", /格式无效/);
  assert.deepEqual(shortcutParts("Ctrl+Shift+S"), ["Ctrl", "Shift", "S"]);
});

test("shortcut values use the same canonical form as Go registration", () => {
  assert.equal(normalizeShortcut("option+shift+s"), "Alt+Shift+S");
  assert.equal(normalizeShortcut("control+a"), "Ctrl+A");
  assert.equal(normalizeShortcut("Meta+F8"), "Super+F8");
  assert.equal(normalizeShortcut("F8"), "F8");
  assert.equal(normalizeShortcut("Ctrl+"), null);
  assert.equal(normalizeShortcut("Ctrl+Alt"), null);
});
