import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createSiteServer } from './serve.mjs';

let dir;
let server;
let base;

before(async () => {
  dir = await mkdtemp(join(tmpdir(), 'serve-test-'));
  await mkdir(join(dir, 'site', 'assets', 'css'), { recursive: true });
  await mkdir(join(dir, 'site', 'docs'), { recursive: true });
  await writeFile(join(dir, 'site', 'index.html'), '<h1>home</h1>');
  await writeFile(join(dir, 'site', 'docs', 'index.html'), '<h1>docs</h1>');
  await writeFile(join(dir, 'site', '404.html'), '<h1>missing</h1>');
  await writeFile(join(dir, 'site', 'assets', 'css', 'a.css'), 'body{}');
  await writeFile(join(dir, 'secret.txt'), 'outside the root');
  server = createSiteServer(join(dir, 'site'));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  await rm(dir, { recursive: true, force: true });
});

test('serves index.html at /', async () => {
  const res = await fetch(`${base}/`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /^text\/html/);
  assert.equal(await res.text(), '<h1>home</h1>');
});

test('serves a directory index', async () => {
  const res = await fetch(`${base}/docs/`);
  assert.equal(res.status, 200);
  assert.equal(await res.text(), '<h1>docs</h1>');
});

test('serves assets with their content type', async () => {
  const res = await fetch(`${base}/assets/css/a.css`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /^text\/css/);
});

test('ignores query strings', async () => {
  const res = await fetch(`${base}/assets/css/a.css?v=1`);
  assert.equal(res.status, 200);
});

test('serves 404.html with status 404 for missing nested paths', async () => {
  const res = await fetch(`${base}/a/b/c`);
  assert.equal(res.status, 404);
  assert.equal(await res.text(), '<h1>missing</h1>');
});

test('refuses paths that escape the site root', async () => {
  const res = await fetch(`${base}/..%2fsecret.txt`);
  assert.equal(res.status, 403);
});

test('rejects malformed percent-encoding with 400', async () => {
  const res = await fetch(`${base}/%E0%A4%A`);
  assert.equal(res.status, 400);
});
