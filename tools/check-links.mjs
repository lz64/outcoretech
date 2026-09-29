// Verifies that every internal href/src (HTML) and url() (CSS) under site/ points at an existing
// file and, for #fragments, at an existing id. External URLs (scheme: or //host) are skipped.
import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';

const HTML_REF = /\s(?:href|src)="([^"]*)"/g;
const CSS_REF = /url\(\s*["']?([^"')]+)["']?\s*\)/g;
const ID = /\sid="([^"]+)"/g;
const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

async function listFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await listFiles(path)));
    else out.push(path);
  }
  return out;
}

async function isFile(path) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

export async function findBrokenLinks(siteDir) {
  const root = resolve(siteDir);
  const show = (file) => relative(root, file).split(sep).join('/');
  const idCache = new Map();
  const idsOf = async (file) => {
    if (!idCache.has(file)) {
      const html = await readFile(file, 'utf8');
      idCache.set(file, new Set([...html.matchAll(ID)].map((m) => m[1])));
    }
    return idCache.get(file);
  };

  const problems = [];
  for (const file of await listFiles(root)) {
    const ext = extname(file);
    if (ext !== '.html' && ext !== '.css') continue;
    const text = await readFile(file, 'utf8');
    const refs = [...text.matchAll(ext === '.html' ? HTML_REF : CSS_REF)].map((m) => m[1]);
    for (const ref of refs) {
      if (ref === '' || EXTERNAL.test(ref)) continue;
      const [beforeHash, fragment = ''] = ref.split('#');
      const path = decodeURIComponent(beforeHash.split('?')[0]);
      let target;
      if (path === '') target = file;
      else if (path.startsWith('/')) target = join(root, path);
      else target = resolve(dirname(file), path);
      if (path.endsWith('/')) target = join(target, 'index.html');
      if (!(await isFile(target))) {
        problems.push(`${show(file)}: ${ref} → missing file`);
      } else if (fragment && extname(target) === '.html' && !(await idsOf(target)).has(fragment)) {
        problems.push(`${show(file)}: ${ref} → no element with id "${fragment}"`);
      }
    }
  }
  return problems;
}

if (import.meta.main) {
  const problems = await findBrokenLinks(process.argv[2] ?? 'site');
  for (const problem of problems) console.log(`BROKEN ${problem}`);
  console.log(problems.length ? `${problems.length} broken reference(s)` : 'All internal references resolve');
  process.exitCode = problems.length ? 1 : 0;
}
