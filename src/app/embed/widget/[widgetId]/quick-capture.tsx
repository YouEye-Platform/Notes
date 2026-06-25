"use client";

import { useState } from "react";
import { Plus, Check, Loader2 } from "lucide-react";

export default function QuickCaptureWidget() {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "done">("idle");

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setStatus("saving");
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: text.trim() }),
      });
      if (res.ok) {
        setStatus("done");
        setText("");
        setTimeout(() => setStatus("idle"), 1500);
      } else {
        setStatus("idle");
      }
    } catch {
      setStatus("idle");
    }
  };

  return (
    <div className="h-full p-2">
      <div className="h-full rounded-xl bg-card/50 backdrop-blur-md border border-border/20 p-3 flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Quick Capture</h3>
        <div className="flex gap-2 flex-1">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
            placeholder="Write a note..."
            className="flex-1 text-sm bg-muted/30 border border-border/40 rounded-lg px-3 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            onClick={handleSubmit}
            disabled={!text.trim() || status === "saving"}
            className="h-8 w-8 rounded-lg bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center transition-colors disabled:opacity-50 shrink-0"
          >
            {status === "saving" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : status === "done" ? (
              <Check className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
