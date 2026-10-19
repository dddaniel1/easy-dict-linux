import test from "node:test";
import assert from "node:assert/strict";
import { resetBubble, triggerBubble } from "../src/lib/bubble.ts";

function bubble(call = () => Promise.resolve()) {
  globalThis.window = { mygo: { call } };
  resetBubble();
}

test("each new selection can trigger once, including identical reselections", () => {
  let calls = 0;
  bubble(() => { calls++; return Promise.resolve(); });
  triggerBubble(); triggerBubble();
  assert.equal(calls, 1);
  resetBubble(); triggerBubble();
  assert.equal(calls, 2);
});

test("resetting a selection does not translate; clicking sends the translation action", () => {
  let calls = 0;
  bubble((method) => {
    assert.equal(method, "AppBridge.OnBubbleClicked");
    calls++;
    return Promise.resolve();
  });
  resetBubble();
  assert.equal(calls, 0);
  triggerBubble();
  assert.equal(calls, 1);
});

test("failed RPC does not permanently disable the bubble", async () => {
  let calls = 0;
  bubble(() => { calls++; return Promise.reject(new Error("IPC unavailable")); });
  triggerBubble();
  await Promise.resolve();
  triggerBubble();
  await Promise.resolve();
  assert.equal(calls, 2);
});

test("missing bridge does not prevent a later click once the bridge is ready", () => {
  let calls = 0;
  globalThis.window = {};
  resetBubble(); triggerBubble();
  window.mygo = { call: () => { calls++; return Promise.resolve(); } };
  triggerBubble();
  assert.equal(calls, 1);
});
