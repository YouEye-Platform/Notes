import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";
import { createTranslator } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
const require = createRequire(import.meta.url);
const root = new URL("../", import.meta.url);
const code = ts.transpileModule(readFileSync(new URL("src/components/launch-requirements-banner.tsx", root), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
for (const [locale, expected] of [["en", "needs permission"], ["ru", "нужно разрешение"], ["es", "necesita permiso"], ["de", "benötigt eine Berechtigung"], ["fr", "nécessite une autorisation"]]) {
  test(`permission banner renders in ${locale} and hides when no approval is required`, () => {
    const path = new URL(`messages/${locale}.json`, root);
    const messages = JSON.parse(readFileSync(existsSync(path) ? path : new URL(`src/messages/${locale}.json`, root)));
    const api = {};
    runInNewContext(code, { exports: api, require(id) {
      if (id === "next-intl") return { useTranslations: namespace => createTranslator({ locale, messages, namespace }) };
      return require(id);
    } });
    const props = { appName: "Example <App>", requirements: { approval_required: true, approval_url_absolute: "https://example.test/approve", permissions: [{ title: "External permission" }] } };
    const html = renderToStaticMarkup(createElement(api.LaunchRequirementsBanner, props));
    assert.ok(html.includes(expected), locale);
    assert.ok(html.includes("Example &lt;App&gt;"));
    assert.ok(html.includes("External permission"));
    assert.ok(html.includes('href="https://example.test/approve"'));
    assert.equal(renderToStaticMarkup(createElement(api.LaunchRequirementsBanner, { ...props, requirements: null })), "");
    assert.equal(renderToStaticMarkup(createElement(api.LaunchRequirementsBanner, { ...props, requirements: { approval_required: false } })), "");
  });
}
