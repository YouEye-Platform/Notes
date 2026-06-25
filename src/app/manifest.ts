import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  const appName = process.env.APP_NAME || "Notes";
  const platformName = process.env.PLATFORM_NAME || "YouEye";

  return {
    name: `${appName} — ${platformName}`,
    short_name: appName,
    description: "Create, organize, and share notes",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0f",
    theme_color: "#f59e0b",
    orientation: "any",
    icons: [
      { src: "/api/pwa/icon?size=192", sizes: "192x192", type: "image/svg+xml" },
      { src: "/api/pwa/icon?size=512", sizes: "512x512", type: "image/svg+xml" },
      { src: "/api/pwa/icon?size=512&maskable=1", sizes: "512x512", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
