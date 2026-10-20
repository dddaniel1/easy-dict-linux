export type InlineToken =
  | { type: "text"; value: string }
  | { type: "strong"; value: string }
  | { type: "em"; value: string }
  | { type: "code"; value: string };

export type MarkdownBlock =
  | { type: "heading"; level: number; inlines: InlineToken[] }
  | { type: "paragraph"; inlines: InlineToken[] }
  | { type: "list"; ordered: boolean; items: InlineToken[][] }
  | { type: "code"; value: string }
  | { type: "divider" };

export function parseInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\))/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > last) tokens.push({ type: "text", value: text.slice(last, index) });
    const value = match[0];
    if (match[2] && match[3]) {
      tokens.push({ type: "text", value: match[2] });
      tokens.push({ type: "text", value: ` (${match[3]})` });
    } else if (value.startsWith("**")) tokens.push({ type: "strong", value: value.slice(2, -2) });
    else if (value.startsWith("`")) tokens.push({ type: "code", value: value.slice(1, -1) });
    else tokens.push({ type: "em", value: value.slice(1, -1) });
    last = index + value.length;
  }
  if (last < text.length) tokens.push({ type: "text", value: text.slice(last) });
  return tokens;
}

// A deliberately small Markdown parser for model output. It never creates
// raw HTML, so untrusted response text stays text.
export function parseMarkdown(source: string): MarkdownBlock[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let code: { lines: string[]; fence: string } | null = null;

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ type: "paragraph", inlines: parseInline(paragraph.join(" ")) });
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list) {
      blocks.push({
        type: "list",
        ordered: list.ordered,
        items: list.items.map(parseInline),
      });
      list = null;
    }
  };

  for (const line of lines) {
    if (code) {
      if (line.trim().startsWith(code.fence)) {
        blocks.push({ type: "code", value: code.lines.join("\n") });
        code = null;
      } else {
        code.lines.push(line);
      }
      continue;
    }

    const fence = line.trim().match(/^(`{3,}|~{3,})/);
    if (fence) {
      flushParagraph();
      flushList();
      code = { lines: [], fence: fence[1] };
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({ type: "heading", level: heading[1].length, inlines: parseInline(heading[2]) });
      continue;
    }

    if (/^([-*_])\s*(\1\s*){2,}$/.test(line.trim())) {
      flushParagraph();
      flushList();
      blocks.push({ type: "divider" });
      continue;
    }

    const unordered = line.match(/^\s*[-*+]\s+(.+)$/);
    const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);
    if (unordered || ordered) {
      flushParagraph();
      const isOrdered = Boolean(ordered);
      if (!list || list.ordered !== isOrdered) {
        flushList();
        list = { ordered: isOrdered, items: [] };
      }
      list!.items.push((unordered || ordered)![1]);
      continue;
    }

    flushList();
    paragraph.push(line.trim());
  }

  if (code) blocks.push({ type: "code", value: code.lines.join("\n") });
  flushParagraph();
  flushList();
  return blocks;
}
