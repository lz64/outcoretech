import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { checkFormConfig, PLACEHOLDER_KEY } from './check-config.mjs';

const KEY = '98353593-5ec7-47a2-8dbe-5ffe29725846';
const LIVE = 'https://outcoretech.com/#message-sent';
// Retired at Stage 2: Web3Forms' free plan refuses cross-domain redirects, so this value on
// outcoretech.com would silently break the no-JS confirmation.
const RETIRED_PREVIEW = 'https://lz64.github.io/outcoretech/#message-sent';
const page = ({ key = KEY, redirect = LIVE, extra = '', emailName = 'email' } = {}) =>
  `<form action="https://api.web3forms.com/submit" method="POST">
     <input type="hidden" name="access_key" value="${key}">
     <input type="hidden" name="redirect" value="${redirect}">
     <input id="f-email" name="${emailName}" type="email">${extra}
   </form>`;

test('accepts the live key with the outcoretech.com redirect', () => {
  assert.deepEqual(checkFormConfig(page(), { requireLiveKey: true }), []);
});

test('rejects the retired lz64.github.io preview redirect', () => {
  const problems = checkFormConfig(page({ redirect: RETIRED_PREVIEW }), { requireLiveKey: true });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /^redirect /);
});

test('rejects a key that is not a UUID', () => {
  assert.equal(checkFormConfig(page({ key: 'abc' })).length, 1);
});

test('rejects the placeholder key only when a live key is required', () => {
  assert.deepEqual(checkFormConfig(page({ key: PLACEHOLDER_KEY })), []);
  assert.equal(checkFormConfig(page({ key: PLACEHOLDER_KEY }), { requireLiveKey: true }).length, 1);
});

test('rejects any other redirect', () => {
  assert.equal(checkFormConfig(page({ redirect: 'https://example.com/#message-sent' })).length, 1);
});

test('rejects a replyto field', () => {
  assert.equal(checkFormConfig(page({ extra: '<input type="hidden" name="replyto" value="x@y.z">' })).length, 1);
});

test('requires the email input to be named exactly "email"', () => {
  assert.equal(checkFormConfig(page({ emailName: 'Email' })).length, 1);
});

test('site/index.html passes with a live key', async () => {
  assert.deepEqual(checkFormConfig(await readFile('site/index.html', 'utf8'), { requireLiveKey: true }), []);
});
