"use client";

import { useTranslations as useInterfaceTranslations } from "next-intl";
/**
 * Home Button — Links back to the YE-UI dashboard.
 */



import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HomeButtonProps {
  uiBaseUrl: string;
}

export function HomeButton({ uiBaseUrl }: HomeButtonProps) {
  const translateInterface = useInterfaceTranslations("interface");

  let href = uiBaseUrl;
  if (!href && typeof window !== "undefined") {
    const host = window.location.hostname;
    const parts = host.split(".");
    // Strip the app subdomain to get the base domain
    if (parts.length > 2) {
      href = `${window.location.protocol}//${parts.slice(1).join(".")}`;
    }
  }
  if (!href) href = "/";

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9"
      asChild
    >
      <a href={href} title={translateInterface("m3a78695388b3")}>
        <Home className="h-4 w-4" />
      </a>
    </Button>
  );
}
