import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(new URL("../src/lib/locale.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const exports = {};
new Function("exports", compiled)(exports);

test("authorized supported locale propagates and untrusted or absent values fall back", () => {
  for (const locale of ["en", "ru", "es", "de", "fr"]) assert.equal(exports.resolveAppLocale(locale), locale);
  for (const value of [null, undefined, "", "../private", "ru-RU", { locale: "ru" }]) {
    assert.equal(exports.resolveAppLocale(value), "en");
  }
  assert.deepEqual(["ru", "fr", undefined, "de"].map(exports.resolveAppLocale), ["ru", "fr", "en", "de"]);
});
