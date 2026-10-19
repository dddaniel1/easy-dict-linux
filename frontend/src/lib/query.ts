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

// A session owns its results; cancelling it prevents older queries or refreshes from updating the UI.
export function startQuery(
  services: string[],
  querySingle: (id: string) => Promise<ServiceResult>,
  onResult: (result: ServiceResult) => void,
) {
  let cancelled = false;
  const revisions = new Map<string, number>();
  async function refresh(id: string) {
    const revision = (revisions.get(id) || 0) + 1;
    revisions.set(id, revision);
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
    if (!cancelled && revisions.get(id) === revision) onResult({ ...result, service_id: id });
  }
  for (const id of services) void refresh(id);
  return { refresh, cancel: () => { cancelled = true; } };
}
