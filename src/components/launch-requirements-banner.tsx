import { ShieldCheck } from "lucide-react";
import type { LaunchRequirements } from "@/lib/types";

interface LaunchRequirementsBannerProps {
  appName: string;
  requirements: LaunchRequirements | null;
}

export function LaunchRequirementsBanner({ appName, requirements }: LaunchRequirementsBannerProps) {
  if (!requirements?.approval_required || !requirements.approval_url_absolute) return null;

  const permissions = requirements.permissions ?? requirements.required_permissions ?? [];

  return (
    <section className="border-b border-border bg-amber-50/90 px-4 py-3 text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-medium">{appName} needs permission to finish setup</p>
            <p className="mt-1 text-xs opacity-80">
              {permissions.map((permission) => permission.title).join(", ")}
            </p>
          </div>
        </div>
        <a
          href={requirements.approval_url_absolute}
          className="inline-flex h-9 items-center justify-center rounded-md bg-amber-900 px-4 text-sm font-medium text-white transition-colors hover:bg-amber-800 dark:bg-amber-200 dark:text-amber-950 dark:hover:bg-amber-100"
        >
          Allow
        </a>
      </div>
    </section>
  );
}
