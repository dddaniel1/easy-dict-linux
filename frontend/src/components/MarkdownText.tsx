import React from "react";
import { parseMarkdown, InlineToken } from "@/lib/markdown";

function Inline({ tokens }: { tokens: InlineToken[] }) {
  return (
    <>
      {tokens.map((token, index) => {
        if (token.type === "strong") return <strong key={index}>{token.value}</strong>;
        if (token.type === "em") return <em key={index}>{token.value}</em>;
        if (token.type === "code") {
          return (
            <code key={index} className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[0.92em] dark:bg-zinc-800">
              {token.value}
            </code>
          );
        }
        return <React.Fragment key={index}>{token.value}</React.Fragment>;
      })}
    </>
  );
}

export function MarkdownText({ text }: { text: string }) {
  const blocks = parseMarkdown(text);
  return (
    <div className="space-y-2 text-xs leading-relaxed text-zinc-800 dark:text-zinc-200">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          const className = block.level <= 2
            ? "text-sm font-semibold text-zinc-950 dark:text-zinc-50 pt-1"
            : "text-xs font-semibold text-zinc-900 dark:text-zinc-100 pt-1";
          return <div key={index} className={className}><Inline tokens={block.inlines} /></div>;
        }
        if (block.type === "list") {
          const Tag = block.ordered ? "ol" : "ul";
          return (
            <Tag key={index} className={block.ordered ? "list-decimal pl-5 space-y-1" : "list-disc pl-5 space-y-1"}>
              {block.items.map((item, itemIndex) => <li key={itemIndex}><Inline tokens={item} /></li>)}
            </Tag>
          );
        }
        if (block.type === "code") {
          return (
            <pre key={index} className="overflow-x-auto rounded-lg bg-zinc-100 p-2.5 text-[11px] dark:bg-zinc-800/80">
              <code>{block.value}</code>
            </pre>
          );
        }
        if (block.type === "divider") return <hr key={index} className="border-zinc-200 dark:border-zinc-800" />;
        return <p key={index}><Inline tokens={block.inlines} /></p>;
      })}
    </div>
  );
}
