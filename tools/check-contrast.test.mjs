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

test('site.css keeps hex colours inside the two :root token blocks (plus the #000 mask alpha)', async () => {
  const css = await readFile('site/assets/css/site.css', 'utf8');
  const outside = css
    .replace(/:root\s*\{[^}]*\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/radial-gradient\([^;]*\)/g, (m) => m.replace(/#000\b/g, ''));
  assert.deepEqual(outside.match(/#[0-9a-f]{3,8}\b/gi) ?? [], []);
});

test('the logo mark tokens are defined per theme; the spectrum ends on the node colour', async () => {
  const { light, dark } = parseThemes(await readFile('site/assets/css/site.css', 'utf8'));
  for (const [theme, t] of Object.entries({ light, dark })) {
    for (const name of ['spectrum-1', 'spectrum-2', 'spectrum-3', 'spectrum-4', 'spectrum-5', 'spectrum-6', 'signal-node', 'signal-node-off']) {
      assert.match(t[name] ?? '', /^#[0-9a-f]{6}$/, `${theme} --${name} is an opaque hex colour`);
    }
    assert.equal(t['spectrum-6'], t['signal-node'], `${theme}: --spectrum-6 equals --signal-node`);
  }
  // The unlit node is a dim amber: between the header background (--surface at 90% over --bg) and the lit node.
  const header = { light: '#ffffff', dark: '#151a20' };
  for (const [theme, t] of Object.entries({ light, dark })) {
    const toNode = contrastRatio(t['signal-node-off'], t['signal-node']);
    const toHeader = contrastRatio(t['signal-node-off'], header[theme]);
    assert.ok(toNode > 1.3 && toHeader > 1.3, `${theme} --signal-node-off is distinct from both (${toHeader} / ${toNode})`);
    assert.ok(contrastRatio(header[theme], t['signal-node']) > Math.max(toNode, toHeader), `${theme} --signal-node-off sits between them`);
  }
});
