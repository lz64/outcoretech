// Zero-dependency static server that behaves like GitHub Pages for this site:
// directories serve index.html, missing paths serve 404.html with status 404.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

async function isFile(path) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

async function send(res, status, file) {
  const body = await readFile(file);
  res.writeHead(status, {
    'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
    'cache-control': 'no-store',
  });
  res.end(body);
}

export function createSiteServer(root) {
  const rootDir = resolve(root);
  return createServer(async (req, res) => {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch {
      res.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Bad request');
      return;
    }
    const target = normalize(join(rootDir, pathname));
    if (target !== rootDir && !target.startsWith(rootDir + sep)) {
      res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Forbidden');
      return;
    }
    if (await isFile(target)) return send(res, 200, target);
    const index = join(target, 'index.html');
    if (await isFile(index)) return send(res, 200, index);
    const notFound = join(rootDir, '404.html');
    if (await isFile(notFound)) return send(res, 404, notFound);
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  });
}

if (import.meta.main) {
  const root = process.argv[2] ?? 'site';
  const port = Number(process.env.PORT ?? 4173);
  createSiteServer(root).listen(port, '127.0.0.1', () => {
    console.log(`Serving ${root} at http://127.0.0.1:${port}/`);
  });
}
