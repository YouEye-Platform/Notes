/**
 * @youeye/canvas/embed — Embed layout for widgets and timeline cards
 *
 * Usage in your app's src/app/embed/layout.tsx:
 *   import { EmbedLayout } from "@youeye/canvas/embed";
 *   export default EmbedLayout;
 *
 * This layout:
 * - Hides the app header/nav
 * - Makes background transparent (for dashboard widget containers)
 * - Removes padding/margin/overflow
 * - Suitable for /embed/widget/* and /embed/timeline/* routes
 */

import React from "react";

const EMBED_CSS = `
  header, nav { display: none !important; }
  .ye-mobile-shell-only, .ye-mobile-shell-spacer { display: none !important; }
  html, body { background: transparent !important; margin: 0; padding: 0; overflow: hidden; }
  main { margin: 0 !important; padding: 0 !important; }
`;

const EMBED_PROTOCOL_SCRIPT = `
  (function() {
    if (window.parent === window) return;
    var readySent = false;
    var resizeTimer = 0;
    function postReady() {
      if (readySent) return;
      readySent = true;
      window.parent.postMessage({ type: "youeye:ready" }, "*");
    }
    function measureHeight() {
      var body = document.body;
      var html = document.documentElement;
      return Math.max(
        body ? body.scrollHeight : 0,
        body ? body.offsetHeight : 0,
        html ? html.scrollHeight : 0,
        html ? html.offsetHeight : 0,
        html ? html.clientHeight : 0
      );
    }
    function postResize() {
      var height = Math.ceil(measureHeight());
      if (height > 0) window.parent.postMessage({ type: "youeye:resize", height: height }, "*");
    }
    function scheduleResize() {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function() {
        postReady();
        postResize();
      }, 100);
    }
    function boot() {
      postReady();
      scheduleResize();
      if ("ResizeObserver" in window) {
        var observer = new ResizeObserver(scheduleResize);
        observer.observe(document.documentElement);
        if (document.body) observer.observe(document.body);
      }
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", boot, { once: true });
    } else {
      boot();
    }
    window.addEventListener("load", scheduleResize);
    window.addEventListener("resize", scheduleResize);
  })();
`;

export function EmbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: EMBED_CSS }} />
      <script dangerouslySetInnerHTML={{ __html: EMBED_PROTOCOL_SCRIPT }} />
      {children}
    </>
  );
}
