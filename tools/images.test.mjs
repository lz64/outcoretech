import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

function pngSize(buf) {
  assert.equal(buf.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'not a PNG');
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

test('og-image.png is 1200×630 and under 300 KB', async () => {
  const buf = await readFile('site/assets/img/og-image.png');
  assert.deepEqual(pngSize(buf), { width: 1200, height: 630 });
  assert.ok(buf.length < 300 * 1024, `${buf.length} bytes`);
});

test('apple-touch-icon.png is 180×180', async () => {
  assert.deepEqual(pngSize(await readFile('site/assets/img/apple-touch-icon.png')), { width: 180, height: 180 });
});

test('favicon.ico holds exactly one 32×32 PNG', async () => {
  const ico = await readFile('site/assets/img/favicon.ico');
  assert.equal(ico.readUInt16LE(2), 1);
  assert.equal(ico.readUInt16LE(4), 1);
  assert.deepEqual(pngSize(ico.subarray(ico.readUInt32LE(18))), { width: 32, height: 32 });
});

for (const name of ['favicon.svg', 'logo.svg']) {
  test(`${name} is a bare SVG that contains the logo mark`, async () => {
    const svg = await readFile(`site/assets/img/${name}`, 'utf8');
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    assert.match(svg, /M26\.34 12\.24A11 11 0 1 1 19\.76 5\.66/);
    assert.match(svg, /M19\.2 12\.8L26\.5 5\.5/);
  });
}
