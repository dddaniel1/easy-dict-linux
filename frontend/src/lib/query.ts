import type { AppConfig, ServiceResult } from "../types.ts";

export function translationSettingsChanged(before: AppConfig | null, after: AppConfig): boolean {
  const fields: (keyof AppConfig)[] = [
    "enabled_services", "ai_enabled", "ai_base_url", "ai_api_key", "ai_model",
    "deepl_enabled", "deepl_auth_key", "deepl_is_free",
  ];
  return fields.some((key) => JSON.stringify(before?.[key]) !== JSON.stringify(after[key]));
}

export function enabledServices(config: AppConfig | null): string[] {
  if (!config) return ["youdao", "bing", "google"];
  let localAI = false;
  try {
    localAI = ["localhost", "127.0.0.1", "[::1]"].includes(new URL(config.ai_base_url).hostname);
  } catch {}
  return [...new Set(config.enabled_services)].filter((id) => {
    if (id === "ai") return config.ai_enabled && (localAI || !!config.ai_api_key.trim());
    if (id === "deepl") return config.deepl_enabled && !!config.deepl_auth_key.trim();
    return ["youdao", "bing", "google"].includes(id);
  });
}

// Stop is an action on the running query, not on the search box. Only show it
// while at least one service still has work in flight.
export function hasPendingResults(results: ServiceResult[]): boolean {
  return results.some((result) => result.status === "loading");
}

// A session owns its results; cancelling it prevents older queries or refreshes
// from updating the UI and reports the services that were still pending.
export function startQuery(
  services: string[],
  querySingle: (id: string) => Promise<ServiceResult>,
  onResult: (result: ServiceResult) => void,
  onCancel?: (serviceIDs: string[]) => void,
) {
  let cancelled = false;
  const revisions = new Map<string, number>();
  const pending = new Set(services);
  const settled = new Set<string>();
  async function refresh(id: string) {
    const revision = (revisions.get(id) || 0) + 1;
    revisions.set(id, revision);
    pending.add(id);
    settled.delete(id);
    const started = performance.now();
    let result: ServiceResult;
    try {
      result = await querySingle(id);
      if (!result) throw new Error("服务返回了空结果");
    } catch (error) {
      result = {
        service_id: id, service_name: id, status: "error", is_dictionary: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
    if (!result.duration_ms && result.status === "success") {
      result.duration_ms = Math.max(0, Math.round(performance.now() - started));
    }
    if (!cancelled && revisions.get(id) === revision) {
      pending.delete(id);
      settled.add(id);
      onResult({ ...result, service_id: id });
    }
  }
  for (const id of services) void refresh(id);
  return {
    refresh,
    cancel: () => {
      if (cancelled) return;
      cancelled = true;
      onCancel?.([...pending].filter((id) => !settled.has(id)));
      pending.clear();
    },
  };
}
