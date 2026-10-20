import React from "react";
import { ServiceResult } from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MarkdownText } from "@/components/MarkdownText";
import { friendlyError } from "@/lib/friendly-error";
import { Volume2, Copy, RefreshCw, BookOpen, Globe, Sparkles, Zap, FileText, AlertCircle } from "lucide-react";

interface ServiceCardProps {
  result: ServiceResult;
  onRefresh: (id: string) => void;
  onCopy: (text: string) => void;
  onSpeak: (text: string, audioUrl?: string) => void;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({
  result,
  onRefresh,
  onCopy,
  onSpeak,
}) => {
  const getIcon = () => {
    switch (result.service_id) {
      case "youdao":
        return <BookOpen className="w-4 h-4 text-rose-500" />;
      case "bing":
        return <Globe className="w-4 h-4 text-sky-500" />;
      case "google":
        return <Globe className="w-4 h-4 text-emerald-500" />;
      case "ai":
        return <Sparkles className="w-4 h-4 text-amber-500" />;
      case "deepl":
        return <Zap className="w-4 h-4 text-indigo-500" />;
      default:
        return <FileText className="w-4 h-4 text-zinc-500" />;
    }
  };

  const sourceLabel = result.is_dictionary
    ? "词典"
    : result.service_id === "ai"
      ? "AI"
      : "翻译";
  // Copy and read-aloud are useful for definitions too, not only for sentence
  // translations. Include examples as a fallback for dictionary-only results.
  const resultText = (() => {
    const sections: string[] = [];
    if (result.translation) sections.push(result.translation);
    if (result.definitions?.length) {
      sections.push(result.definitions.map((d) => `${d.pos ? d.pos + " " : ""}${d.meanings.join("；")}`).join("\n"));
    }
    if (!sections.length && result.sentences?.length) {
      sections.push(result.sentences.map((sentence) => `${sentence.source}\n${sentence.target}`).join("\n"));
    }
    return sections.join("\n\n").trim();
  })();
  const canCopy = Boolean(resultText);
  const priority = result.is_dictionary ? "ring-1 ring-rose-200/80 dark:ring-rose-900/50" : "";

  return (
    <Card
      aria-busy={result.status === "loading"}
      className={`${priority} hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors`}
    >
      <CardHeader>
        <CardTitle className="min-w-0">
          {getIcon()}
          <span className="truncate">{result.service_name}</span>
          <Badge variant={result.is_dictionary ? "pos" : "secondary"} className="shrink-0 text-[10px]">
            {sourceLabel}
          </Badge>
          {result.status === "success" && result.duration_ms !== undefined && (
            <span className="shrink-0 text-[10px] font-normal text-zinc-400">
              {result.duration_ms < 1000 ? `${result.duration_ms} ms` : `${(result.duration_ms / 1000).toFixed(1)} s`}
            </span>
          )}
          {result.status === "loading" && (
            <span className="shrink-0 text-xs font-normal text-zinc-400">查询中...</span>
          )}
          {result.status === "cancelled" && (
            <span className="shrink-0 text-xs font-normal text-zinc-400">已停止</span>
          )}
        </CardTitle>
        <div className="flex shrink-0 items-center gap-1">
          {canCopy && (
            <Button
              variant="ghost"
              size="icon"
              aria-label={`朗读 ${result.service_name} 的结果`}
              className="h-7 w-7 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              onClick={() => onSpeak(resultText)}
              title="朗读结果"
            >
              <Volume2 className="h-3.5 w-3.5" />
            </Button>
          )}
          {canCopy && (
            <Button
              variant="ghost"
              size="icon"
              aria-label={`复制 ${result.service_name} 的结果`}
              className="h-7 w-7 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              onClick={() => onCopy(resultText)}
              title="复制结果"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            aria-label={`刷新 ${result.service_name}`}
            disabled={result.status === "loading"}
            className="h-7 w-7 text-zinc-500 hover:text-zinc-900 disabled:opacity-40 dark:hover:text-zinc-100"
            onClick={() => onRefresh(result.service_id)}
            title={result.status === "loading" ? "正在查询" : "重新查询此服务"}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${result.status === "loading" ? "animate-spin motion-reduce:animate-none" : ""}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent key={result.status} className={result.status === "loading" ? undefined : "result-content"}>
        {result.status === "loading" && (
          <div className="flex items-center justify-center py-6 text-xs text-zinc-400 gap-2">
            <div className="w-4 h-4 border-2 border-zinc-200 border-t-blue-500 rounded-full animate-spin motion-reduce:animate-none" />
            <span>正在请求服务结果...</span>
          </div>
        )}

        {result.status === "error" && (
          <div className="flex items-start gap-2.5 rounded-lg border border-red-100 bg-red-50/80 p-3 text-xs text-red-700 dark:border-red-950 dark:bg-red-950/30 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="font-medium">暂时无法获取结果</div>
              <div className="mt-0.5 leading-relaxed text-red-600/90 dark:text-red-300/90">
                {friendlyError(result.service_id, result.error)}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 h-6 border-red-200 bg-white/70 px-2 text-[11px] text-red-700 hover:bg-white dark:border-red-900 dark:bg-transparent dark:text-red-300"
                onClick={() => onRefresh(result.service_id)}
              >
                <RefreshCw className="mr-1 h-3 w-3" />
                重试
              </Button>
            </div>
          </div>
        )}

        {result.status === "cancelled" && (
          <div className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400">
            <span>查询已停止</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[11px]"
              onClick={() => onRefresh(result.service_id)}
            >
              重新查询
            </Button>
          </div>
        )}

        {result.status === "success" && (
          <div className="space-y-3">
            {/* Phonetics */}
            {result.phonetics && result.phonetics.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {result.phonetics.map((p, idx) => (
                  <div
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-xs text-zinc-700 dark:text-zinc-300"
                  >
                    <span className="font-semibold text-zinc-400 uppercase text-[10px]">
                      {p.type}
                    </span>
                    <span className="font-mono">{p.symbol}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 text-blue-500 hover:text-blue-600"
                      onClick={() => onSpeak("", p.audio_url)}
                      title="发音"
                    >
                      <Volume2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Dictionary Definitions */}
            {result.definitions && result.definitions.length > 0 && (
              <div className="space-y-1.5">
                {result.definitions.map((def, idx) => (
                  <div key={idx} className="flex items-baseline gap-2 text-xs leading-relaxed">
                    {def.pos && <Badge variant="pos">{def.pos}</Badge>}
                    <span className="text-zinc-800 dark:text-zinc-200">
                      {def.meanings.join("； ")}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Translation Result (plain text or model Markdown) */}
            {result.translation && (!result.definitions || result.definitions.length === 0) && (
              <MarkdownText text={result.translation} />
            )}

            {/* Example Sentences */}
            {result.sentences && result.sentences.length > 0 && (
              <div className="pt-2.5 mt-2 border-t border-dashed border-zinc-200 dark:border-zinc-800 space-y-2">
                <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  权威双语例句
                </div>
                {result.sentences.map((sp, idx) => (
                  <div key={idx} className="text-xs space-y-0.5">
                    <div className="text-zinc-900 dark:text-zinc-100 font-medium">
                      {sp.source}
                    </div>
                    <div className="text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
                      <span>{sp.target}</span>
                      {sp.source_dict && (
                        <span className="italic text-[10px] text-zinc-400">
                          — {sp.source_dict}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
