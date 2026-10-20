const NETWORK = /network|offline|connection|timed? out|timeout|econn|dns|tls|fetch/i;
const AUTH = /401|403|unauthorized|forbidden|api key|authentication|auth key/i;
const RATE = /429|rate limit|too many requests|quota/i;
const PARSE = /parse|json|unexpected end|invalid character|解析/i;

function serviceHint(serviceID: string): string {
  switch (serviceID) {
    case "ai":
      return "请检查设置中的 API Key、Base URL 和模型名称。";
    case "deepl":
      return "请检查设置中的 DeepL Authentication Key 和 Free/Pro 类型。";
    case "youdao":
      return "有道词典仅支持英译中；其他语言请改用 Bing、Google、AI 或 DeepL。";
    case "bing":
    case "google":
      return "可稍后重试，或改用其他翻译服务。";
    default:
      return "可稍后重试，或打开设置检查服务配置。";
  }
}

// Convert internal provider errors into a short reason plus an actionable next
// step. Unknown details are retained below the friendly explanation.
export function friendlyError(serviceID: string, raw?: string): string {
  const detail = (raw || "").trim();
  if (!detail) return "服务没有返回结果。" + serviceHint(serviceID);

  if (AUTH.test(detail)) {
    return "认证失败：API Key 无效或没有权限。" + serviceHint(serviceID);
  }
  if (RATE.test(detail)) {
    return "请求过于频繁或额度已用完，请稍后再试。" + serviceHint(serviceID);
  }
  if (NETWORK.test(detail)) {
    return "网络连接失败或请求超时。" + serviceHint(serviceID);
  }
  if (PARSE.test(detail)) {
    return "服务返回了无法解析的内容。" + serviceHint(serviceID);
  }
  if (/service not found|服务不存在/i.test(detail)) {
    return "服务不可用，请在设置中重新选择。" + serviceHint(serviceID);
  }
  if (/未识别出|no text/i.test(detail)) {
    return "没有识别到文字，请重新框选更清晰的区域。";
  }

  return detail + " " + serviceHint(serviceID);
}
