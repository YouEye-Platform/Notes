import { NextRequest, NextResponse } from "next/server";

const APP_COLOR = "#f59e0b"; // amber
const APP_LETTER = "N";
const APP_BG = "#0f172a";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const size = parseInt(searchParams.get("size") || "512", 10);
  const maskable = searchParams.get("maskable") === "1";

  const padding = maskable ? size * 0.1 : 0;
  const innerSize = size - padding * 2;
  const fontSize = innerSize * 0.5;
  const borderRadius = size * 0.2;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${borderRadius}" fill="${APP_BG}"/>
  <rect x="${padding + innerSize * 0.1}" y="${padding + innerSize * 0.1}" width="${innerSize * 0.8}" height="${innerSize * 0.8}" rx="${borderRadius * 0.6}" fill="${APP_COLOR}" opacity="0.15"/>
  <text x="${size / 2}" y="${size / 2}" font-family="system-ui, -apple-system, sans-serif" font-size="${fontSize}" font-weight="700" fill="${APP_COLOR}" text-anchor="middle" dominant-baseline="central">${APP_LETTER}</text>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
