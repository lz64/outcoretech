import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const FONTS = [
  'ibm-plex-sans-latin-var.woff2',
  'ibm-plex-mono-latin-400.woff2',
  'ibm-plex-mono-latin-500.woff2',
  'ibm-plex-sans-hebrew-400.woff2',
];

for (const name of FONTS) {
  test(`${name} is a woff2 file under 60 KB`, async () => {
    const buf = await readFile(`site/assets/fonts/${name}`);
    assert.equal(buf.subarray(0, 4).toString('latin1'), 'wOF2');
    assert.ok(buf.length < 60 * 1024, `${name} is ${buf.length} bytes`);
  });
}

test('the SIL Open Font License ships with the fonts', async () => {
  const text = await readFile('site/assets/fonts/OFL.txt', 'utf8');
  assert.match(text, /SIL Open Font License/);
  assert.match(text, /IBM Plex Sans/);
  assert.match(text, /IBM Plex Mono/);
  assert.ok(text.includes('IBM Plex Sans Hebrew'), 'OFL.txt covers IBM Plex Sans Hebrew');
});
