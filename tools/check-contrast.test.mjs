import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { contrastRatio, parseThemes, checkContract } from './check-contrast.mjs';

test('contrastRatio matches WCAG reference values', () => {
  assert.equal(contrastRatio('#000000', '#ffffff'), 21);
  assert.equal(contrastRatio('#ffffff', '#ffffff'), 1);
  assert.ok(Math.abs(contrastRatio('#777777', '#ffffff') - 4.48) < 0.01);
});

test('parseThemes reads light :root and merges the dark override', () => {
  const css = `
    :root { --bg: #ffffff; --text: #000000; --accent: #ffb020; --font-sans: "X", sans-serif; }
    @media (prefers-color-scheme: dark) { :root { --bg: #000000; --text: #ffffff; } }`;
  const { light, dark } = parseThemes(css);
  assert.deepEqual(light, { bg: '#ffffff', text: '#000000', accent: '#ffb020' });
  assert.deepEqual(dark, { bg: '#000000', text: '#ffffff', accent: '#ffb020' });
});

test('checkContract flags failing and missing pairs', () => {
  const results = checkContract(
    { light: { bg: '#ffffff', text: '#777777' } },
    [{ fg: ['text', 'muted'], bg: ['bg'], min: 4.5 }],
  );
  assert.equal(results.length, 2);
  assert.equal(results[0].pass, false); // 4.48 < 4.5
  assert.equal(results[1].pass, false); // --muted missing
});

test('site.css meets the spec §4.1 contrast contract in both themes', async () => {
  const css = await readFile('site/assets/css/site.css', 'utf8');
  const failures = checkContract(parseThemes(css)).filter((r) => !r.pass);
  assert.deepEqual(failures, []);
});
