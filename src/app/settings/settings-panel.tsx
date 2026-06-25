"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type FontSize = "small" | "medium" | "large" | "xl";

interface Settings {
  readonly editor_font_size: FontSize;
}

const FONT_SIZE_OPTIONS: readonly { readonly value: FontSize; readonly label: string }[] = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
  { value: "xl", label: "XL" },
];

export function NotesSettingsPanel({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings>({ editor_font_size: "medium" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          if (data.settings) setSettings(data.settings as Settings);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleFontSizeChange = async (fontSize: FontSize) => {
    const updated: Settings = { ...settings, editor_font_size: fontSize };
    setSettings(updated);
    setSaving(true);
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-48 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={embedded ? "p-4" : "mx-auto max-w-2xl px-6 py-8"}>
      {!embedded && (
        <div className="mb-8">
          <Button variant="ghost" size="sm" onClick={() => router.push("/")} className="mb-4 gap-1">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="mt-1 text-muted-foreground">Customize your Notes experience.</p>
        </div>
      )}

      <div className="rounded-xl border border-border/60 bg-card p-6">
        <h2 className="mb-1 text-sm font-semibold text-foreground">Editor Font Size</h2>
        <p className="mb-4 text-xs text-muted-foreground">Choose the font size for the note editor.</p>

        <div className="flex gap-2">
          {FONT_SIZE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => handleFontSizeChange(option.value)}
              className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                settings.editor_font_size === option.value
                  ? "border-blue-500 bg-blue-500/10 text-blue-500"
                  : "border-border/60 text-foreground hover:bg-accent/50"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {saving && (
          <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Saving...
          </p>
        )}
      </div>
    </div>
  );
}
