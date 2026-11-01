import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import {createTranslator} from 'next-intl';
const translateApp = process.cwd().endsWith('YE-App-Translate');
const messages = locale => JSON.parse(readFileSync(new URL(`../${translateApp ? 'src/' : ''}messages/${locale}.json`, import.meta.url)));
const code = ts.transpileModule(readFileSync(new URL('../src/i18n/activity.ts', import.meta.url),'utf8'), {
  compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true}
}).outputText;
const requests = [];
const api = {};
runInNewContext(code, {exports:api, require(id) {
  if (id === 'next-intl') return {createTranslator};
  if (id === '@/lib/api') return {createApiClient: () => ({fetchHeaderConfig: async userId => {
    requests.push(userId); return userId === 'russian' ? {locale:'ru'} : userId === 'regional' ? {locale:'fr-CA'} : userId === 'invalid' ? {locale:'xx'} : {locale:'en'};
  }})};
  if (id === '@/lib/locale') return {resolveAppLocale: value => ['en','ru','es','de','fr'].includes(value?.split('-')[0]) ? value.split('-')[0] : 'en'};
  if (id.endsWith('.json')) return messages(id.match(/([a-z]{2})\.json$/)[1]);
  throw new Error(id);
}});

test('background activity resolves each authorized recipient independently without browser session or global user cache', async () => {
  const key = Object.entries(messages('en').interface).find(([,value]) => value === 'Visited link')[0];
  const a = await api.getActivityTranslator('english');
  const b = await api.getActivityTranslator('russian');
  const c = await api.getActivityTranslator('regional');
  const d = await api.getActivityTranslator('invalid');
  assert.equal(a.locale,'en'); assert.equal(b.locale,'ru'); assert.equal(c.locale,'fr'); assert.equal(d.locale,'en');
  assert.notEqual(a.t(key),b.t(key));
  assert.equal(a.t(key),d.t(key));
  assert.deepEqual(requests,['english','russian','regional','invalid']);
});
