import test from "node:test";
import assert from "node:assert/strict";
import { friendlyError } from "../src/lib/friendly-error.ts";

test("provider errors explain the reason and next step", () => {
  assert.match(friendlyError("ai", "API Key is not configured"), /API Key.*设置/);
  assert.match(friendlyError("deepl", "HTTP 429: too many requests"), /频繁|额度/);
  assert.match(friendlyError("bing", "network request failed: timeout"), /网络/);
  assert.match(friendlyError("google", "Failed to parse response"), /无法解析/);
});
