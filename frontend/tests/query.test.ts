import test from "node:test";
import assert from "node:assert/strict";
import { enabledServices, startQuery, translationSettingsChanged } from "../src/lib/query.ts";
import type { ServiceResult, AppConfig } from "../src/types.ts";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((ok, fail) => { resolve = ok; reject = fail; });
  return { promise, resolve, reject };
}
const result = (id: string, text: string): ServiceResult => ({
  service_id: id, service_name: id, status: "success", is_dictionary: false, translation: text,
});
const settle = () => new Promise<void>((resolve) => setImmediate(resolve));

test("appearance and interaction settings do not trigger new translations", () => {
  const before = { enabled_services: ["youdao", "bing"], ai_model: "old", theme: "light" } as AppConfig;
  assert.equal(translationSettingsChanged(before, { ...before, theme: "dark", auto_show_floating_button: false }), false);
  assert.equal(translationSettingsChanged(before, { ...before, ai_model: "new" }), true);
  assert.equal(translationSettingsChanged(before, { ...before, enabled_services: ["google"] }), true);
});

test("fast service displays while a slower service is still pending", async () => {
  const slow = deferred<ServiceResult>();
  const seen: ServiceResult[] = [];
  const session = startQuery(["slow", "fast"], (id) =>
    id === "slow" ? slow.promise : Promise.resolve(result(id, "fast result")),
    (value) => seen.push(value));
  await settle();
  assert.deepEqual(seen.map((r) => r.service_id), ["fast"]);
  slow.resolve(result("slow", "slow result"));
  await settle();
  assert.deepEqual(seen.map((r) => r.service_id), ["fast", "slow"]);
  session.cancel();
});

test("cancelled queries cannot overwrite a newer query or an empty screen", async () => {
  const old = deferred<ServiceResult>();
  const seen: ServiceResult[] = [];
  const session = startQuery(["youdao"], () => old.promise, (value) => seen.push(value));
  session.cancel();
  startQuery(["youdao"], async () => result("youdao", "new"), (value) => seen.push(value));
  await settle();
  old.resolve(result("youdao", "old"));
  await settle();
  assert.deepEqual(seen.map((r) => r.translation), ["new"]);
});

test("refresh supersedes the original request and earlier refreshes", async () => {
  const requests = [deferred<ServiceResult>(), deferred<ServiceResult>(), deferred<ServiceResult>()];
  let index = 0;
  const seen: ServiceResult[] = [];
  const session = startQuery(["bing"], () => requests[index++].promise, (value) => seen.push(value));
  void session.refresh("bing");
  void session.refresh("bing");
  requests[2].resolve(result("bing", "latest"));
  await settle();
  requests[0].resolve(result("bing", "original"));
  requests[1].reject(new Error("old error"));
  await settle();
  assert.deepEqual(seen.map((r) => r.translation), ["latest"]);
});

test("rejected and empty responses become errors without blocking other services", async () => {
  const seen: ServiceResult[] = [];
  startQuery(["failed", "empty", "ok"], async (id) => {
    if (id === "failed") throw new Error("offline");
    if (id === "empty") return null as unknown as ServiceResult;
    return result(id, "ok");
  }, (value) => seen.push(value));
  await settle();
  assert.deepEqual(seen.map((r) => r.status), ["error", "error", "success"]);
});

test("unconfigured paid services are skipped; local AI requires no API key", () => {
  const cfg = {
    enabled_services: ["youdao", "ai", "deepl"], ai_enabled: true,
    ai_base_url: "https://api.deepseek.com/v1", ai_api_key: "",
    deepl_enabled: true, deepl_auth_key: "",
  } as AppConfig;
  assert.deepEqual(enabledServices(cfg), ["youdao"]);
  cfg.ai_base_url = "http://localhost:11434/v1";
  assert.deepEqual(enabledServices(cfg), ["youdao", "ai"]);
  cfg.ai_enabled = false;
  assert.deepEqual(enabledServices(cfg), ["youdao"]);
  cfg.ai_enabled = true;
  cfg.ai_base_url = "https://localhost.example.com/v1";
  assert.deepEqual(enabledServices(cfg), ["youdao"]);
});
