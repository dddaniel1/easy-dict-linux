import test from "node:test";
import assert from "node:assert/strict";
import { parseInline, parseMarkdown } from "../src/lib/markdown.ts";

test("model Markdown becomes safe structured blocks", () => {
  const blocks = parseMarkdown([
    "### 释义",
    "",
    "- **apple**：苹果",
    "- 常见搭配：`an apple a day`",
    "",
    "1. 第一项",
    "2. 第二项",
    "",
    "```",
    "<script>alert(1)</script>",
    "```",
  ].join("\n"));

  assert.equal(blocks[0].type, "heading");
  assert.equal(blocks[1].type, "list");
  assert.equal(blocks[2].type, "list");
  assert.equal(blocks[3].type, "code");
  assert.match((blocks[3] as { value: string }).value, /<script>/);
  const inline = parseInline("**bold** and `code`");
  assert.deepEqual(inline.map((token) => token.type), ["strong", "text", "code"]);
});

test("Markdown links render as text plus URL rather than raw HTML", () => {
  const tokens = parseInline("[OpenAI](https://openai.com)");
  assert.deepEqual(tokens, [
    { type: "text", value: "OpenAI" },
    { type: "text", value: " (https://openai.com)" },
  ]);
});
