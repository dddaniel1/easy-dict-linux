import React from "react";
import { createRoot } from "react-dom/client";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resetBubble, triggerBubble } from "@/lib/bubble";
import "./index.css";
import "./bubble.css";

window.__easydict_reset_bubble = resetBubble;

createRoot(document.getElementById("root")!).render(
  <Button
    id="bubble"
    className="bubble-btn"
    size="icon"
    aria-label="翻译选中文字"
    title="点击翻译选中文字"
    onClick={(event) => {
      event.stopPropagation();
      triggerBubble();
    }}
  >
    <Languages className="h-[17px] w-[17px]" aria-hidden="true" />
  </Button>
);
