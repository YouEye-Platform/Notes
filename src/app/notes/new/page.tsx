"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function NewNotePage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function createNote() {
      try {
        const res = await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "", content: "" }),
        });

        if (!cancelled && res.ok) {
          const data = await res.json();
          const noteId = data.data?.id;
          if (noteId) {
            router.replace(`/notes/${noteId}`);
            return;
          }
        }

        if (!cancelled) {
          router.replace("/");
        }
      } catch {
        if (!cancelled) {
          router.replace("/");
        }
      }
    }

    createNote();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Creating note...</p>
      </div>
    </div>
  );
}
