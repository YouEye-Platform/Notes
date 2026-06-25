import { createCanvasMiddleware } from "@/lib/middleware";
import { initSession } from "@/lib/auth";

initSession("ye-notes");

export const middleware = createCanvasMiddleware({
  appId: "ye-notes",
  publicRoutes: ["/api/notes/shared/", "/shared/", "/embed/timeline/", "/embed/widget/"],
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons).*)"],
};
