import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { findBrokenLinks } from './check-links.mjs';

let dir;

before(async () => {
  dir = await mkdtemp(join(tmpdir(), 'links-test-'));
  await mkdir(join(dir, 'assets', 'css'), { recursive: true });
  await mkdir(join(dir, 'assets', 'fonts'), { recursive: true });
  await writeFile(join(dir, 'assets', 'fonts', 'f.woff2'), '');
  await writeFile(
    join(dir, 'assets', 'css', 'site.css'),
    '@font-face{src:url("../fonts/f.woff2")} .a{background:url(data:image/png;base64,AA)} .b{background:url("../fonts/missing.woff2")}',
  );
  await writeFile(
    join(dir, 'index.html'),
    `<a href="#ok">x</a><a href="#nope">x</a><div id="ok"></div>
     <link href="assets/css/site.css"><img src="assets/img/gone.png" alt="">
     <a href="https://example.com/">x</a><a href="mailto:a@b.c">x</a>
     <a href="page.html#sec">x</a><a href="page.html#missing">x</a>`,
  );
  await writeFile(
    join(dir, 'page.html'),
    '<p id="sec"></p><a href="/#ok">x</a><a href="/assets/css/site.css?v=2">x</a><a href="/#gone">x</a>',
  );
});

after(async () => rm(dir, { recursive: true, force: true }));

test('reports exactly the broken references', async () => {
  const problems = await findBrokenLinks(dir);
  assert.deepEqual(problems.sort(), [
    'assets/css/site.css: ../fonts/missing.woff2 → missing file',
    'index.html: #nope → no element with id "nope"',
    'index.html: assets/img/gone.png → missing file',
    'index.html: page.html#missing → no element with id "missing"',
    'page.html: /#gone → no element with id "gone"',
  ].sort());
});
