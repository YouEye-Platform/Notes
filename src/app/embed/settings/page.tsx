"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { NotesSettingsPanel } from "@/app/settings/settings-panel";

export default function SettingsEmbedPage() {
  return (
    <Suspense fallback={<div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
      <NotesSettingsPanel embedded />
    </Suspense>
  );
}
