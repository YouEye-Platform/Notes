import { createRequire } from "node:module";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(new URL("../src/lib/locale.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, resolveJsonModule: true } }).outputText;
const exports = {};
new Function("exports", "require", compiled)(exports, createRequire(new URL("../src/lib/locale.ts", import.meta.url)));

test("authorized supported locale propagates and untrusted or absent values fall back", () => {
  for (const locale of ["en", "ru", "es", "de", "fr"]) assert.equal(exports.resolveAppLocale(locale), locale);
  for (const value of [null, undefined, "", "../private", { locale: "ru" }]) {
    assert.equal(exports.resolveAppLocale(value), "en");
  }
  assert.deepEqual(["ru", "fr", undefined, "de"].map(exports.resolveAppLocale), ["ru", "fr", "en", "de"]);
});

test("regional variants use a shipped base catalogue", () => {
  assert.equal(exports.resolveAppLocale("ru-RU"), "ru");
  assert.equal(exports.resolveAppLocale("FR-ca"), "fr");
});
