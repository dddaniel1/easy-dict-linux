import React from "react";
import { ServiceResult } from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Volume2, Copy, RefreshCw, BookOpen, Globe, Sparkles, Zap, FileText } from "lucide-react";

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

  const copyContent = () => {
    let text = result.translation || "";
    if (!text && result.definitions) {
      text = result.definitions.map((d) => `${d.pos} ${d.meanings.join(", ")}`).join("\n");
    }
    onCopy(text);
  };

  const speakContent = () => {
    onSpeak(result.translation || "");
  };

  return (
    <Card aria-busy={result.status === "loading"} className="hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
      <CardHeader>
        <CardTitle>
          {getIcon()}
          <span>{result.service_name}</span>
          {result.status === "loading" && (
            <span className="text-xs font-normal text-zinc-400">查询中...</span>
          )}
        </CardTitle>
        <div className="flex items-center gap-1">
          {(result.translation || (result.definitions && result.definitions.length > 0)) && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              onClick={speakContent}
              title="朗读"
            >
              <Volume2 className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            onClick={copyContent}
            title="复制"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            onClick={() => onRefresh(result.service_id)}
            title="刷新"
          >
            <RefreshCw className="h-3.5 w-3.5" />
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
          <div className="p-3 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-xs rounded-md">
            ❌ {result.error || "服务请求出错"}
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

            {/* Translation Result (Plain text or Markdown) */}
            {result.translation && (!result.definitions || result.definitions.length === 0) && (
              <div className="text-xs leading-relaxed text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap">
                {result.translation}
              </div>
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
