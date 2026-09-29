# Outcore Tech Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the single-page Outcore Tech marketing site ("Control Room" design), make its contact form deliver to contact@outcoretech.com, deploy it to GitHub Pages, and cut outcoretech.com over to it.

**Architecture:** The site is static HTML, CSS, and a small progressive-enhancement JS file, with no build step. It lives in `site/`, which is the only folder deployed. Dev-only Node tooling in `tools/` handles serving, static checks, asset generation, smoke tests, Lighthouse, and DNS. Browser tests in `tests/` use Playwright and axe. A GitHub Actions workflow validates and then deploys `site/` to Pages. The form posts to Web3Forms: a JSON `fetch` when JS is on, and a native POST with a CSS `:target` confirmation when it's off.

**Tech Stack:**
- HTML5, CSS (custom properties, `color-mix`, `:user-invalid`), vanilla JS (ES2022)
- Node ≥ 24.2 (for `import.meta.main`); the local machine has 24.5.0
- `@playwright/test` 1.63.0, `@axe-core/playwright` 4.13.0, `html-validate` 11.4.0 (the newest release that supports Node 24.0–24.7), `lighthouse` 13.5.0 and `chrome-launcher` 1.2.1, `@fontsource-variable/ibm-plex-sans` 5.3.0, `@fontsource/ibm-plex-mono` 5.3.0
- GitHub Actions: `actions/checkout@v7`, `actions/setup-node@v7`, `actions/upload-artifact@v7`, `actions/configure-pages@v6`, `actions/upload-pages-artifact@v5`, `actions/deploy-pages@v5`

**Spec:** `docs/superpowers/specs/2026-09-28-outcore-tech-site-design.md`. Read the spec before starting any task; section numbers (§) below refer to it.

## Global Constraints

- Only `site/` is deployed. Nothing in `tools/`, `tests/`, `docs/`, or the repo root may be referenced by `site/`.
- `index.html` uses only **relative** URLs (for example `assets/css/site.css`). `404.html` uses only **root-absolute** URLs (for example `/assets/css/site.css`, `/#services`) (§3.10).
- No third-party requests on page load. The only external endpoint is `https://api.web3forms.com/submit`, and it is called only when the form is submitted.
- Copy is verbatim from spec §3, in the first person, and uses straight apostrophes (`'`). Em dashes (`—`), en dashes (`–`), the ellipsis (`…`), `·`, and `©` are literal characters. `&` is written as `&amp;` in HTML.
- Naming rule: "Production Process Optimization" in service headings, the select, and the meta description. "Process Optimization" in the hero strip, tags, and title. `OPTIMIZATION` in the footer mono line.
- Colors come only from the tokens in spec §4.1. The only hex values allowed in `site/assets/css/*.css` are the token definitions in the two `:root` blocks, plus `#000` as the alpha value inside the hero's `mask-image` gradients. SVG files in `site/assets/img/` and the files in `tools/brand/` are exempt.
- The access key is `98353593-5ec7-47a2-8dbe-5ffe29725846` (Ari's Web3Forms key, which is public by design).
- The `redirect` field is `https://lz64.github.io/outcoretech/#message-sent` until Stage 2 step 6 (Task 15), and `https://outcoretech.com/#message-sent` after that.
- There is no `replyto` field. The email input is named exactly `email`.
- Commits use the repo-local identity `Ari Friedman <51067939+lz64@users.noreply.github.com>`, which is already configured. End every commit message with:
  ```
  Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01E9jrTVS6SFnYr1XeKBHVJs
  ```
- Shell: commands are written for Git Bash on Windows and also run unchanged in the CI Ubuntu runner. npm scripts invoke only `node` and package binaries, never shell builtins.
- Never automate a real Web3Forms submission (spec §5.3 item 5). Tests mock `https://api.web3forms.com/submit` with `page.route`.

## Review Focus

These are the failure modes most likely to bite a real visitor that the spec implies but doesn't spell out. Each one has a test in the task named.

1. **Impatient double submit.** A double-click on Send, or Enter pressed while a request is in flight, must produce exactly one API request (Task 9).
2. **Hung API request.** If Web3Forms never answers, the button must not stay on "Sending…" forever. After 15 s the visitor sees the failure message, and their input is kept (Task 9).
3. **Non-ASCII input.** Names and messages like `José O'Brien` and `25 °C … 温度 🚀` must reach the API byte-for-byte (Task 9).
4. **Deep links under the sticky header.** Arriving at `/#contact` or following a strip link to `#ai` must not leave the target heading hidden behind the 64 px header (Task 12).
5. **Enlarged default text.** A visitor whose browser default font size is 20 px (125%) must see no horizontal scroll and no clipped header at 375 px (Task 12).

---

## File Map

| Path | Responsibility | Task |
|---|---|---|
| `package.json`, `package-lock.json` | Dev tooling and scripts | 1 |
| `.gitignore`, `.gitattributes` | Ignore build/test output; LF line endings, binary assets | 1 |
| `.htmlvalidate.json` | HTML validation rules | 1 |
| `playwright.config.js` | Browser test runner and local server | 1 |
| `tools/serve.mjs` (+ `tools/serve.test.mjs`) | Zero-dependency static server that mimics GitHub Pages (index.html, 404.html) | 1 |
| `tools/check-contrast.mjs` (+ test) | Parses the tokens in `site.css` and enforces the §4.1 contrast contract | 2 |
| `tools/copy-fonts.mjs`, `tools/fonts.test.mjs` | Copies the Plex woff2 files and the licence into `site/assets/fonts/` | 2 |
| `site/assets/css/site.css` | All styles (built up across tasks) | 2, 4–11 |
| `tools/ico.mjs` (+ test), `tools/make-images.mjs`, `tools/brand/*.html`, `tools/images.test.mjs` | Renders `og-image.png`, `apple-touch-icon.png`, `favicon.ico` | 3 |
| `site/assets/img/logo.svg`, `site/assets/img/favicon.svg` | Hand-written brand SVGs | 3 |
| `tools/check-links.mjs` (+ test) | Checks internal files and `#fragment` targets for every href/src/url() | 4 |
| `site/index.html` | The page (built up across tasks) | 4–10 |
| `site/robots.txt`, `site/sitemap.xml` | Crawling | 4 |
| `tools/check-config.mjs` (+ test) | Guards the form's access_key, redirect, and no-replyto rules | 8 |
| `site/assets/js/site.js` | Mobile nav and form enhancement | 9, 10 |
| `site/assets/css/nojs.css` | No-JS header and nav layout | 10 |
| `site/404.html` | Not-found page | 11 |
| `tools/smoke.mjs`, `tools/lighthouse.mjs` | Checks a deployed URL: smoke test with screenshots, and Lighthouse medians | 12 |
| `tests/*.spec.js`, `tests/helpers.js` | Browser tests | 4–12 |
| `.github/workflows/pages.yml`, `README.md` | CI deploy, owner docs | 13 |
| `tools/dns.mjs` (+ test) | DNS before-snapshot and cutover verification | 15 |

---

### Task 1: Tooling foundation and dev server

**Files:**
- Create: `package.json`, `.gitignore`, `.gitattributes`, `.htmlvalidate.json`, `playwright.config.js`, `tools/serve.mjs`, `tools/serve.test.mjs`

**Interfaces:**
- Produces:
  - `createSiteServer(rootDir: string): http.Server`, exported from `tools/serve.mjs`. It serves files under `rootDir`. A directory resolves to its `index.html`. A missing path returns `404.html` with status 404, or plain text if there is no 404.html. Paths that escape the root return 403.
  - The CLI `node tools/serve.mjs [root=site]` listens on `127.0.0.1:${PORT ?? 4173}`.
  - The npm scripts `serve`, `test:unit`, `validate:html`, `check`, `check:live`, `test:e2e`, `test`, `fonts`, and `images`.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "outcoretech-site",
  "private": true,
  "type": "module",
  "description": "Source for https://outcoretech.com (deployed folder: site/)",
  "engines": {
    "node": ">=24.2"
  },
  "scripts": {
    "serve": "node tools/serve.mjs site",
    "test:unit": "node --test \"tools/*.test.mjs\"",
    "validate:html": "html-validate \"site/**/*.html\"",
    "check": "npm run test:unit && npm run validate:html && node tools/check-contrast.mjs && node tools/check-links.mjs && node tools/check-config.mjs",
    "check:live": "node tools/check-config.mjs --require-live-key",
    "test:e2e": "playwright test",
    "test": "npm run check && npm run test:e2e",
    "fonts": "node tools/copy-fonts.mjs",
    "images": "node tools/make-images.mjs"
  },
  "devDependencies": {
    "@axe-core/playwright": "4.13.0",
    "@fontsource-variable/ibm-plex-sans": "5.3.0",
    "@fontsource/ibm-plex-mono": "5.3.0",
    "@playwright/test": "1.63.0",
    "chrome-launcher": "1.2.1",
    "html-validate": "11.4.0",
    "lighthouse": "13.5.0"
  }
}
```

The `check` script references tools created in later tasks. Until then, run the individual scripts named in each task, not `npm run check`. `npm run check` is first expected to pass at the end of Task 8.

- [ ] **Step 2: Create `.gitignore`, `.gitattributes`, `.htmlvalidate.json`**

`.gitignore`:
```gitignore
node_modules/
test-results/
playwright-report/
screenshots/
dns-snapshots/
lighthouse-*.json
*.log
```

`.gitattributes`:
```gitattributes
* text=auto eol=lf
*.woff2 binary
*.png binary
*.ico binary
```

`.htmlvalidate.json`:
```json
{
  "extends": ["html-validate:recommended"]
}
```

- [ ] **Step 3: Install dependencies and the Playwright browser**

Run:
```bash
npm install
npx playwright install chromium
```
Expected: `added N packages` with no `ERR!` lines. An `EBADENGINE` warning for any package is a failure: stop and report it. The Chromium download then completes.

- [ ] **Step 4: Write the failing server test `tools/serve.test.mjs`**

```js
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
```

- [ ] **Step 5: Run it to verify it fails**

Run: `node --test tools/serve.test.mjs`
Expected: FAIL with `Cannot find module` (or `ERR_MODULE_NOT_FOUND`) for `./serve.mjs`.

- [ ] **Step 6: Implement `tools/serve.mjs`**

```js
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
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npm run test:unit`
Expected: `ℹ pass 7`, `ℹ fail 0`.

- [ ] **Step 8: Create `playwright.config.js`**

```js
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node tools/serve.mjs site',
    url: 'http://127.0.0.1:4173/robots.txt',
    reuseExistingServer: false, // never test against a stale or foreign server on 4173
    env: { PORT: '4173' },
  },
});
```

`webServer.url` points at `robots.txt` (created in Task 4). Until Task 4 exists, Playwright isn't run.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json .gitignore .gitattributes .htmlvalidate.json playwright.config.js tools/serve.mjs tools/serve.test.mjs docs/superpowers/plans/2026-09-28-outcore-tech-site.md
git commit -m "chore: add dev tooling and GitHub-Pages-like static server" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01E9jrTVS6SFnYr1XeKBHVJs"
```

---

### Task 2: Design tokens, fonts, base CSS, and the contrast checker

**Files:**
- Create: `tools/check-contrast.mjs`, `tools/check-contrast.test.mjs`, `tools/copy-fonts.mjs`, `tools/fonts.test.mjs`, `site/assets/css/site.css`
- Create (generated by `npm run fonts`): `site/assets/fonts/ibm-plex-sans-latin-var.woff2`, `site/assets/fonts/ibm-plex-mono-latin-400.woff2`, `site/assets/fonts/ibm-plex-mono-latin-500.woff2`, `site/assets/fonts/OFL.txt`

**Interfaces:**
- Produces:
  - From `tools/check-contrast.mjs`: `contrastRatio(a: string, b: string): number`; `parseThemes(css: string): { light: Record<string,string>, dark: Record<string,string> }`, where dark is merged over light; `CONTRACT`; `checkContract(themes): Array<{theme, fg, bg, ratio, min, pass}>`.
  - The CLI `node tools/check-contrast.mjs [css=site/assets/css/site.css]` exits 1 on any failure.
  - CSS custom properties that later tasks rely on: `--bg --surface --surface-2 --line --field-border --text --muted --accent --accent-text --on-accent --focus --danger --font-sans --font-mono --header-h --radius`.
  - Classes: `.container`, `.eyebrow`, `.btn`, `.btn-primary`, `.btn-ghost`, `.skip-link`.

- [ ] **Step 1: Write the failing contrast test `tools/check-contrast.test.mjs`**

```js
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test tools/check-contrast.test.mjs`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `./check-contrast.mjs`.

- [ ] **Step 3: Implement `tools/check-contrast.mjs`**

```js
// Enforces the colour contract in spec §4.1 by reading the tokens straight from site.css.
import { readFile } from 'node:fs/promises';

const TOKEN = /--([a-z0-9-]+)\s*:\s*(#[0-9a-f]{6})\b/gi;
const LIGHT_BLOCK = /:root\s*\{([^}]*)\}/;
const DARK_BLOCK = /@media\s*\(\s*prefers-color-scheme\s*:\s*dark\s*\)\s*\{\s*:root\s*\{([^}]*)\}/;

export const CONTRACT = [
  { fg: ['text', 'muted', 'accent-text', 'danger'], bg: ['bg', 'surface', 'surface-2'], min: 4.5 },
  { fg: ['on-accent'], bg: ['accent'], min: 4.5 },
  { fg: ['field-border', 'focus'], bg: ['bg', 'surface', 'surface-2'], min: 3 },
];

function channel(value) {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const n = Number.parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
}

function tokens(block) {
  return Object.fromEntries([...block.matchAll(TOKEN)].map((m) => [m[1], m[2].toLowerCase()]));
}

export function parseThemes(css) {
  const light = tokens(css.match(LIGHT_BLOCK)?.[1] ?? '');
  const dark = { ...light, ...tokens(css.match(DARK_BLOCK)?.[1] ?? '') };
  return { light, dark };
}

export function checkContract(themes, contract = CONTRACT) {
  const results = [];
  for (const [theme, t] of Object.entries(themes)) {
    for (const rule of contract) {
      for (const fg of rule.fg) {
        for (const bg of rule.bg) {
          const ratio = t[fg] && t[bg] ? contrastRatio(t[fg], t[bg]) : Number.NaN;
          results.push({ theme, fg, bg, ratio, min: rule.min, pass: ratio >= rule.min });
        }
      }
    }
  }
  return results;
}

if (import.meta.main) {
  const file = process.argv[2] ?? 'site/assets/css/site.css';
  const results = checkContract(parseThemes(await readFile(file, 'utf8')));
  for (const r of results) {
    console.log(`${r.pass ? 'ok  ' : 'FAIL'} ${r.theme.padEnd(5)} --${r.fg} on --${r.bg}: ${r.ratio} (min ${r.min})`);
  }
  const failed = results.filter((r) => !r.pass).length;
  console.log(failed ? `${failed} contrast failure(s)` : 'Contrast contract met');
  process.exitCode = failed ? 1 : 0;
}
```

- [ ] **Step 4: Write the failing font test `tools/fonts.test.mjs`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const FONTS = [
  'ibm-plex-sans-latin-var.woff2',
  'ibm-plex-mono-latin-400.woff2',
  'ibm-plex-mono-latin-500.woff2',
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
});
```

- [ ] **Step 5: Implement `tools/copy-fonts.mjs`**

```js
// Copies the Latin-subset IBM Plex woff2 files (and their licence) from npm into site/.
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';

const OUT = 'site/assets/fonts';
const SANS = 'node_modules/@fontsource-variable/ibm-plex-sans';
const MONO = 'node_modules/@fontsource/ibm-plex-mono';

await mkdir(OUT, { recursive: true });
await copyFile(`${SANS}/files/ibm-plex-sans-latin-wght-normal.woff2`, `${OUT}/ibm-plex-sans-latin-var.woff2`);
await copyFile(`${MONO}/files/ibm-plex-mono-latin-400-normal.woff2`, `${OUT}/ibm-plex-mono-latin-400.woff2`);
await copyFile(`${MONO}/files/ibm-plex-mono-latin-500-normal.woff2`, `${OUT}/ibm-plex-mono-latin-500.woff2`);
const sans = await readFile(`${SANS}/LICENSE`, 'utf8');
const mono = await readFile(`${MONO}/LICENSE`, 'utf8');
await writeFile(`${OUT}/OFL.txt`, `IBM Plex Sans\n=============\n\n${sans}\n\nIBM Plex Mono\n=============\n\n${mono}`);
console.log(`Fonts and OFL.txt written to ${OUT}`);
```

- [ ] **Step 6: Generate the fonts**

Run: `npm run fonts`
Expected: `Fonts and OFL.txt written to site/assets/fonts`. The folder then has three `.woff2` files of about 46 KB, 15 KB, and 15 KB, plus `OFL.txt`.

- [ ] **Step 7: Create `site/assets/css/site.css` (tokens and base)**

```css
/* Outcore Tech — "Control Room" styles.
   Spec: docs/superpowers/specs/2026-09-28-outcore-tech-site-design.md §4.
   Colours come only from the tokens below; tools/check-contrast.mjs enforces their contract. */

/* ---------- Fonts (self-hosted, Latin subset, SIL OFL — see ../fonts/OFL.txt) ---------- */
@font-face {
  font-family: "IBM Plex Sans";
  src: url("../fonts/ibm-plex-sans-latin-var.woff2") format("woff2");
  font-weight: 100 700;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "IBM Plex Mono";
  src: url("../fonts/ibm-plex-mono-latin-400.woff2") format("woff2");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "IBM Plex Mono";
  src: url("../fonts/ibm-plex-mono-latin-500.woff2") format("woff2");
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}

/* ---------- Tokens: light (default) ---------- */
:root {
  --bg: #f3f2ee;
  --surface: #ffffff;
  --surface-2: #ebeae5;
  --line: #d6d8dc;
  --field-border: #767e88;
  --text: #12161b;
  --muted: #57616c;
  --accent: #ffb020;
  --accent-text: #8a5a00;
  --on-accent: #16110a;
  --focus: #8a5a00;
  --danger: #b42318;
  --font-sans: "IBM Plex Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  --header-h: 64px;
  --radius: 4px;
}

/* ---------- Tokens: dark ---------- */
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0e1115;
    --surface: #151a20;
    --surface-2: #1b2129;
    --line: #27303a;
    --field-border: #6b7684;
    --text: #e7eaee;
    --muted: #9ba5b1;
    --accent: #ffb020;
    --accent-text: #ffb020;
    --on-accent: #16110a;
    --focus: #ffb020;
    --danger: #ff7a70;
  }
}

/* ---------- Base ---------- */
*, *::before, *::after { box-sizing: border-box; }

html {
  color-scheme: light dark;
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
  scroll-padding-top: calc(var(--header-h) + 8px);
}

@media (prefers-reduced-motion: no-preference) {
  html { scroll-behavior: smooth; }
}

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-sans);
  font-size: 1.0625rem;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3 {
  margin: 0 0 0.5em;
  font-weight: 600;
  line-height: 1.15;
  letter-spacing: -0.01em;
  text-wrap: balance;
}
h1 { font-size: clamp(2.25rem, 1.4rem + 3.6vw, 4rem); }
h2 { font-size: clamp(1.75rem, 1.3rem + 1.9vw, 2.75rem); }
h3 { font-size: 1.25rem; }

p { margin: 0 0 1em; }
p, li, dd { text-wrap: pretty; }

/* :where() keeps this reset at zero specificity, so component margins (.service-strip, .tags, .ticks) win. */
:where(ul[class], ol[class]) { margin: 0; padding: 0; list-style: none; }

a {
  color: var(--accent-text);
  text-decoration-thickness: 1px;
  text-underline-offset: 0.2em;
}
a:hover { text-decoration-thickness: 2px; }

svg { display: block; }

:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
[tabindex="-1"]:focus { outline: none; }

/* ---------- Layout ---------- */
.container {
  width: 100%;
  max-width: 1160px;
  margin-inline: auto;
  padding-inline: 16px;
}
@media (min-width: 480px) { .container { padding-inline: 24px; } }
@media (min-width: 1024px) { .container { padding-inline: 32px; } }

/* ---------- Shared components ---------- */
.eyebrow {
  margin: 0 0 0.75rem;
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent-text);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 44px;
  padding: 0.625rem 1.125rem;
  border: 1px solid transparent;
  border-radius: var(--radius);
  font: 500 1rem/1.2 var(--font-sans);
  text-decoration: none;
  cursor: pointer;
}
.btn-primary { background: var(--accent); color: var(--on-accent); }
.btn-primary:hover { filter: brightness(1.06); }
.btn-ghost { background: transparent; color: var(--text); border-color: var(--field-border); }
.btn-ghost:hover { border-color: var(--text); }
.btn:disabled { opacity: 0.75; cursor: progress; }

.skip-link {
  position: absolute;
  top: -100px;
  left: 8px;
  z-index: 100;
  padding: 0.75rem 1rem;
  border-radius: var(--radius);
  background: var(--accent);
  color: var(--on-accent);
  font-weight: 600;
  text-decoration: none;
}
.skip-link:focus { top: 8px; }
```

- [ ] **Step 8: Run the unit tests and the contrast CLI**

Run: `npm run test:unit && node tools/check-contrast.mjs`
Expected:
- Every test passes (7 from the server, 4 from contrast, 4 from fonts).
- The CLI prints 38 `ok` lines (19 pairs × 2 themes) and ends with `Contrast contract met`.
- If any `FAIL` line appears, adjust **only that token's value** in `site.css` until it passes, record the new value in spec §4.1's table, and rerun.

- [ ] **Step 9: Commit**

```bash
git add tools/check-contrast.mjs tools/check-contrast.test.mjs tools/copy-fonts.mjs tools/fonts.test.mjs site/assets/fonts site/assets/css/site.css
git commit -m "feat: add Control Room tokens, self-hosted Plex fonts, and contrast checker" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01E9jrTVS6SFnYr1XeKBHVJs"
```

---
### Task 3: Brand assets (logo, favicons, Open Graph image)

**Files:**
- Create: `tools/ico.mjs`, `tools/ico.test.mjs`, `tools/images.test.mjs`, `tools/make-images.mjs`, `tools/brand/og-image.html`, `tools/brand/icon.html`, `site/assets/img/favicon.svg`, `site/assets/img/logo.svg`
- Create (generated by `npm run images`): `site/assets/img/og-image.png`, `site/assets/img/apple-touch-icon.png`, `site/assets/img/favicon.ico`

**Interfaces:**
- Consumes: `createSiteServer` (Task 1) and the fonts in `site/assets/fonts/` (Task 2).
- Produces:
  - `pngToIco(png: Buffer, size: number): Buffer`, from `tools/ico.mjs`.
  - The five image files above, at the exact paths that `index.html` links in Task 4.
  - The logo mark geometry that Tasks 4 and 11 reuse inline, inside `viewBox="0 0 32 32"`:
    - ring `M26.34 12.24A11 11 0 1 1 19.76 5.66`
    - core circle `cx=16 cy=16 r=4.5`
    - trace `M19.2 12.8L26.5 5.5`
    - node circle `cx=27 cy=5 r=2.25`

    The ring leaves a 50° gap centred on −45°, and the trace leaves through that gap, forming the "out of the core" motif (spec §4.3).

- [ ] **Step 1: Write the failing ICO test `tools/ico.test.mjs`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pngToIco } from './ico.mjs';

test('pngToIco wraps one PNG in a valid single-image ICO container', () => {
  const png = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');
  const ico = pngToIco(png, 32);
  assert.equal(ico.readUInt16LE(0), 0); // reserved
  assert.equal(ico.readUInt16LE(2), 1); // type: icon
  assert.equal(ico.readUInt16LE(4), 1); // image count
  assert.equal(ico.readUInt8(6), 32); // width
  assert.equal(ico.readUInt8(7), 32); // height
  assert.equal(ico.readUInt16LE(10), 1); // colour planes
  assert.equal(ico.readUInt16LE(12), 32); // bits per pixel
  assert.equal(ico.readUInt32LE(14), png.length); // image byte size
  assert.equal(ico.readUInt32LE(18), 22); // image offset
  assert.deepEqual(ico.subarray(22), png);
});

test('pngToIco encodes a 256 px image as 0 per the ICO format', () => {
  const ico = pngToIco(Buffer.alloc(8), 256);
  assert.equal(ico.readUInt8(6), 0);
  assert.equal(ico.readUInt8(7), 0);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test tools/ico.test.mjs`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `./ico.mjs`.

- [ ] **Step 3: Implement `tools/ico.mjs`**

```js
// Wraps a single PNG in an ICO container (PNG-in-ICO is supported by every current browser).
export function pngToIco(png, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // image count
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size >= 256 ? 0 : size, 0); // width
  entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
  entry.writeUInt8(0, 2); // palette size
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // colour planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(png.length, 8); // image byte size
  entry.writeUInt32LE(header.length + entry.length, 12); // image offset
  return Buffer.concat([header, entry, png]);
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `node --test tools/ico.test.mjs`
Expected: `ℹ pass 2`, `ℹ fail 0`.

- [ ] **Step 5: Write the failing image test `tools/images.test.mjs`**

```js
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
```

- [ ] **Step 6: Run it to verify it fails**

Run: `node --test tools/images.test.mjs`
Expected: FAIL with `ENOENT` for `site/assets/img/og-image.png` (and the other files).

- [ ] **Step 7: Create the hand-written SVGs**

`site/assets/img/favicon.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <style>
    .ring { fill: none; stroke: #12161b; stroke-width: 2.5; stroke-linecap: round; }
    .core, .node { fill: #d98a00; }
    .trace { fill: none; stroke: #d98a00; stroke-width: 2.5; stroke-linecap: round; }
    @media (prefers-color-scheme: dark) {
      .ring { stroke: #e7eaee; }
      .core, .node { fill: #ffb020; }
      .trace { stroke: #ffb020; }
    }
  </style>
  <path class="ring" d="M26.34 12.24A11 11 0 1 1 19.76 5.66"/>
  <circle class="core" cx="16" cy="16" r="4.5"/>
  <path class="trace" d="M19.2 12.8L26.5 5.5"/>
  <circle class="node" cx="27" cy="5" r="2.25"/>
</svg>
```

`site/assets/img/logo.svg`, for Ari's own use in email signatures and documents; the page itself inlines the mark:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 232 32" role="img" aria-label="Outcore Tech">
  <style>
    .ring { fill: none; stroke: #12161b; stroke-width: 2; stroke-linecap: round; }
    .core, .node { fill: #ffb020; }
    .trace { fill: none; stroke: #ffb020; stroke-width: 2; stroke-linecap: round; }
    .word { font: 500 17px "IBM Plex Mono", ui-monospace, Menlo, Consolas, monospace; letter-spacing: 0.14em; fill: #12161b; }
  </style>
  <path class="ring" d="M26.34 12.24A11 11 0 1 1 19.76 5.66"/>
  <circle class="core" cx="16" cy="16" r="4.5"/>
  <path class="trace" d="M19.2 12.8L26.5 5.5"/>
  <circle class="node" cx="27" cy="5" r="2.25"/>
  <text class="word" x="42" y="22">OUTCORE TECH</text>
</svg>
```

- [ ] **Step 8: Create the raster sources**

`tools/brand/icon.html`:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Outcore Tech icon source</title>
  <style>
    html, body { margin: 0; width: 100%; height: 100%; }
    body { display: grid; place-items: center; background: #0e1115; }
    svg { width: 72%; height: 72%; }
    .ring { fill: none; stroke: #e7eaee; stroke-width: 2.25; stroke-linecap: round; }
    .core, .node { fill: #ffb020; }
    .trace { fill: none; stroke: #ffb020; stroke-width: 2.25; stroke-linecap: round; }
  </style>
</head>
<body>
  <svg viewBox="0 0 32 32" aria-hidden="true">
    <path class="ring" d="M26.34 12.24A11 11 0 1 1 19.76 5.66"/>
    <circle class="core" cx="16" cy="16" r="4.5"/>
    <path class="trace" d="M19.2 12.8L26.5 5.5"/>
    <circle class="node" cx="27" cy="5" r="2.25"/>
  </svg>
</body>
</html>
```

`tools/brand/og-image.html`, which is served from the repo root so the font URLs resolve:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Outcore Tech Open Graph image source</title>
  <style>
    @font-face { font-family: "IBM Plex Sans"; src: url("../../site/assets/fonts/ibm-plex-sans-latin-var.woff2") format("woff2"); font-weight: 100 700; }
    @font-face { font-family: "IBM Plex Mono"; src: url("../../site/assets/fonts/ibm-plex-mono-latin-500.woff2") format("woff2"); font-weight: 500; }
    html, body { margin: 0; width: 1200px; height: 630px; }
    body { position: relative; overflow: hidden; background: #0e1115; color: #e7eaee; font-family: "IBM Plex Sans", sans-serif; }
    .grid {
      position: absolute; inset: 0; opacity: 0.55;
      background-image: linear-gradient(#27303a 1px, transparent 1px), linear-gradient(90deg, #27303a 1px, transparent 1px);
      background-size: 24px 24px;
    }
    .frame { position: absolute; inset: 56px 64px; display: flex; flex-direction: column; justify-content: space-between; }
    .brand { display: flex; align-items: center; gap: 18px; font: 500 28px "IBM Plex Mono", monospace; letter-spacing: 0.14em; }
    .brand svg { width: 52px; height: 52px; }
    .ring { fill: none; stroke: #e7eaee; stroke-width: 2; stroke-linecap: round; }
    .core, .node { fill: #ffb020; }
    .trace { fill: none; stroke: #ffb020; stroke-width: 2; stroke-linecap: round; }
    .status { display: flex; align-items: center; gap: 14px; margin: 0 0 22px; font: 500 18px "IBM Plex Mono", monospace; letter-spacing: 0.12em; color: #9ba5b1; }
    .dot { width: 12px; height: 12px; border-radius: 50%; background: #ffb020; box-shadow: 0 0 0 6px rgba(255, 176, 32, 0.25); }
    h1 { margin: 0; max-width: 1000px; font-size: 60px; font-weight: 600; line-height: 1.1; letter-spacing: -0.01em; }
    .strip { display: flex; gap: 30px; font: 500 17px "IBM Plex Mono", monospace; letter-spacing: 0.12em; color: #ffb020; }
  </style>
</head>
<body>
  <div class="grid"></div>
  <div class="frame">
    <div class="brand">
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path class="ring" d="M26.34 12.24A11 11 0 1 1 19.76 5.66"/>
        <circle class="core" cx="16" cy="16" r="4.5"/>
        <path class="trace" d="M19.2 12.8L26.5 5.5"/>
        <circle class="node" cx="27" cy="5" r="2.25"/>
      </svg>
      OUTCORE TECH
    </div>
    <div>
      <p class="status"><span class="dot"></span>SYSTEMS ONLINE // 25 YEARS IN THE FIELD</p>
      <h1>Engineering that connects the plant floor, the network, and the cloud.</h1>
    </div>
    <div class="strip">
      <span>01 AI ENGINEERING</span><span>02 IOT PROTOTYPING</span><span>03 SYSTEMS AUTOMATION</span><span>04 PROCESS OPTIMIZATION</span>
    </div>
  </div>
</body>
</html>
```

- [ ] **Step 9: Implement `tools/make-images.mjs`**

```js
// Renders the raster brand assets from tools/brand/*.html with headless Chromium.
// Re-run after changing the logo, the headline, or the fonts: npm run images
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { createSiteServer } from './serve.mjs';
import { pngToIco } from './ico.mjs';

const OUT = 'site/assets/img';
await mkdir(OUT, { recursive: true });

// Serve the repo root over http so the brand pages can load site/assets/fonts
// (Chromium blocks font loads from file:// pages).
const server = createSiteServer('.');
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}/tools/brand/`;
const browser = await chromium.launch();

async function render(page, file, width, height, fonts = []) {
  await page.setViewportSize({ width, height });
  await page.goto(base + file);
  const missing = await page.evaluate(async (wanted) => {
    await document.fonts.ready;
    return wanted.filter((font) => !document.fonts.check(font));
  }, fonts);
  if (missing.length) throw new Error(`${file}: fonts not loaded: ${missing.join(', ')}`);
  return page.screenshot({ type: 'png' });
}

try {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  const og = await render(page, 'og-image.html', 1200, 630, ['600 60px "IBM Plex Sans"', '500 17px "IBM Plex Mono"']);
  await writeFile(`${OUT}/og-image.png`, og);
  await writeFile(`${OUT}/apple-touch-icon.png`, await render(page, 'icon.html', 180, 180));
  await writeFile(`${OUT}/favicon.ico`, pngToIco(await render(page, 'icon.html', 32, 32), 32));
  console.log(`Wrote og-image.png, apple-touch-icon.png and favicon.ico to ${OUT}`);
} finally {
  await browser.close();
  server.closeAllConnections();
  server.close();
}
```

- [ ] **Step 10: Generate the images and run the tests**

Run: `npm run images && npm run test:unit`
Expected: `Wrote og-image.png, apple-touch-icon.png and favicon.ico to site/assets/img`, then every unit test passes, including the 5 image tests and the 2 ICO tests.

- [ ] **Step 11: Look at the images**

Open `site/assets/img/og-image.png` and `site/assets/img/apple-touch-icon.png` with the Read tool and check four things:
- The headline is in IBM Plex Sans, not a serif fallback.
- The four-item amber strip fits on one line inside the frame.
- Nothing is clipped at any edge.
- The mark shows a ring with a gap at the top-right, with the amber trace leaving through the gap.

If the strip wraps, reduce `.strip` `gap` to `24px` and regenerate.

- [ ] **Step 12: Commit**

```bash
git add tools/ico.mjs tools/ico.test.mjs tools/images.test.mjs tools/make-images.mjs tools/brand site/assets/img
git commit -m "feat: add logo mark, favicons, and Open Graph image" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01E9jrTVS6SFnYr1XeKBHVJs"
```

---

### Task 4: Page shell: head metadata, header, hero copy, section heads, footer, and the link checker

**Files:**
- Create: `tools/check-links.mjs`, `tools/check-links.test.mjs`, `site/index.html`, `site/robots.txt`, `site/sitemap.xml`, `tests/helpers.js`, `tests/metadata.spec.js`, `tests/shell.spec.js`
- Modify: `site/assets/css/site.css` (append)

**Interfaces:**
- Consumes: the tokens and classes from Task 2, and the image paths from Task 3.
- Produces:
  - `findBrokenLinks(siteDir: string): Promise<string[]>`, from `tools/check-links.mjs`. The CLI `node tools/check-links.mjs [site]` exits 1 on any broken reference.
  - These ids in `index.html`, which later tasks rely on: `top` (body), `main`, `hero-title`, `services`, `services-title`, `industries`, `industries-title`, `how-i-work`, `process-title`, `work`, `work-title`, `about`, `about-title`, `contact`, `contact-title`, `site-nav`.
  - Structure that later tasks rely on:
    - `.hero-inner` contains `.hero-copy`. Task 5 appends the schematic after `.hero-copy`.
    - Each `section` has a `.container`. Tasks 6, 7, and 8 **replace whole `<section>` elements** by id.
    - `.header-inner` holds `.brand` then `nav#site-nav`. Task 10 inserts the toggle button between them.
  - From `tests/helpers.js`: `PAGE_TITLE`, `DESCRIPTION`, `fontsReady(page)`.

- [ ] **Step 1: Write the failing link-checker test `tools/check-links.test.mjs`**

```js
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test tools/check-links.test.mjs`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `./check-links.mjs`.

- [ ] **Step 3: Implement `tools/check-links.mjs`**

```js
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
```

- [ ] **Step 4: Run it to verify it passes**

Run: `node --test tools/check-links.test.mjs`
Expected: `ℹ pass 1`, `ℹ fail 0`.

- [ ] **Step 5: Create `site/robots.txt` and `site/sitemap.xml`**

Playwright's web server waits for `robots.txt` before any browser test runs.

`site/robots.txt` (the file ends with a single newline):
```text
User-agent: *
Allow: /

Sitemap: https://outcoretech.com/sitemap.xml
```

`site/sitemap.xml`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://outcoretech.com/</loc>
  </url>
</urlset>
```

- [ ] **Step 6: Write the failing browser tests**

`tests/helpers.js`:
```js
export const PAGE_TITLE = 'Outcore Tech — AI, IoT, Automation & Process Optimization';
export const DESCRIPTION =
  'Outcore Tech: AI engineering, IoT prototyping, systems automation, and production process optimization, backed by 25 years of real-world systems work.';

export async function fontsReady(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}
```

`tests/metadata.spec.js`:
```js
import { test, expect } from '@playwright/test';
import { PAGE_TITLE, DESCRIPTION } from './helpers.js';

test.describe('index.html <head>', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('title, language, description, canonical, viewport, color-scheme', async ({ page }) => {
    await expect(page).toHaveTitle(PAGE_TITLE);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', DESCRIPTION);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://outcoretech.com/');
    await expect(page.locator('meta[name="viewport"]')).toHaveAttribute('content', 'width=device-width, initial-scale=1');
    await expect(page.locator('meta[name="color-scheme"]')).toHaveAttribute('content', 'light dark');
  });

  test('charset is the first element in <head>', async ({ page }) => {
    expect(await page.evaluate(() => document.head.firstElementChild.outerHTML)).toBe('<meta charset="utf-8">');
  });

  test('theme-color per colour scheme', async ({ page }) => {
    await expect(page.locator('meta[name="theme-color"][media="(prefers-color-scheme: light)"]')).toHaveAttribute('content', '#f3f2ee');
    await expect(page.locator('meta[name="theme-color"][media="(prefers-color-scheme: dark)"]')).toHaveAttribute('content', '#0e1115');
  });

  test('Open Graph and Twitter tags', async ({ page }) => {
    const expected = {
      'og:type': 'website',
      'og:url': 'https://outcoretech.com/',
      'og:site_name': 'Outcore Tech',
      'og:locale': 'en_US',
      'og:title': PAGE_TITLE,
      'og:description': DESCRIPTION,
      'og:image': 'https://outcoretech.com/assets/img/og-image.png',
      'og:image:width': '1200',
      'og:image:height': '630',
      'og:image:alt': 'Outcore Tech — engineering from sensor to cloud',
    };
    for (const [property, content] of Object.entries(expected)) {
      await expect(page.locator(`meta[property="${property}"]`)).toHaveAttribute('content', content);
    }
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
  });

  test('icons are linked and served', async ({ page, request }) => {
    const icons = [
      ['link[rel="icon"][type="image/svg+xml"]', 'assets/img/favicon.svg'],
      ['link[rel="icon"][sizes="32x32"]', 'assets/img/favicon.ico'],
      ['link[rel="apple-touch-icon"]', 'assets/img/apple-touch-icon.png'],
    ];
    for (const [selector, href] of icons) {
      await expect(page.locator(selector)).toHaveAttribute('href', href);
      expect((await request.get(`/${href}`)).status()).toBe(200);
    }
  });

  test('exactly two fonts are preloaded', async ({ page }) => {
    const preloads = page.locator('link[rel="preload"][as="font"]');
    await expect(preloads).toHaveCount(2);
    await expect(preloads.nth(0)).toHaveAttribute('href', 'assets/fonts/ibm-plex-sans-latin-var.woff2');
    await expect(preloads.nth(1)).toHaveAttribute('href', 'assets/fonts/ibm-plex-mono-latin-400.woff2');
    for (const i of [0, 1]) {
      await expect(preloads.nth(i)).toHaveAttribute('type', 'font/woff2');
      await expect(preloads.nth(i)).toHaveAttribute('crossorigin', '');
    }
  });

  test('JSON-LD describes the Organization without address or email', async ({ page }) => {
    const data = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());
    expect(data).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': 'https://outcoretech.com/#org',
      name: 'Outcore Tech',
      url: 'https://outcoretech.com/',
      description: DESCRIPTION,
      logo: 'https://outcoretech.com/assets/img/apple-touch-icon.png',
      founder: { '@type': 'Person', name: 'Ari Friedman', jobTitle: 'Computer Systems Engineer' },
    });
    expect(data.knowsAbout).toEqual([
      'AI engineering', 'LLM applications', 'machine learning', 'computer vision',
      'IoT prototyping', 'systems automation', 'production process optimization',
      'ESP32', 'LoRaWAN', 'PLC', 'MES/SCADA', 'HVAC control', 'building automation',
      'real-time video', 'fiber optics', 'Python', 'Azure', 'AWS',
    ]);
    for (const key of ['email', 'address', 'areaServed']) expect(data).not.toHaveProperty(key);
  });
});

test('robots.txt allows everything and points at the sitemap', async ({ request }) => {
  const res = await request.get('/robots.txt');
  expect(res.status()).toBe(200);
  expect(await res.text()).toBe('User-agent: *\nAllow: /\n\nSitemap: https://outcoretech.com/sitemap.xml\n');
});

test('sitemap.xml lists only the home page and has no lastmod', async ({ request }) => {
  const text = await (await request.get('/sitemap.xml')).text();
  expect(text).toContain('<loc>https://outcoretech.com/</loc>');
  expect(text.match(/<loc>/g)).toHaveLength(1);
  expect(text).not.toContain('<lastmod>');
});
```

`tests/shell.spec.js`:
```js
import { test, expect } from '@playwright/test';

test.describe('page shell', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('skip link is the first tab stop and moves focus to main', async ({ page }) => {
    await page.keyboard.press('Tab');
    const skip = page.locator('.skip-link');
    await expect(skip).toBeFocused();
    await expect(skip).toHaveText('Skip to content');
    await page.keyboard.press('Enter');
    await expect(page.locator('main#main')).toBeFocused();
  });

  test('brand links to the top and is named Outcore Tech', async ({ page }) => {
    const brand = page.locator('.site-header .brand');
    await expect(brand).toHaveAttribute('href', '#top');
    await expect(brand).toHaveAccessibleName('Outcore Tech');
    await expect(brand.locator('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  test('primary nav links point at existing sections', async ({ page }) => {
    const links = page.getByRole('navigation', { name: 'Primary' }).getByRole('link');
    await expect(links).toHaveText(['Services', 'Industries', 'Work', 'About', 'Contact']);
    for (const id of ['services', 'industries', 'work', 'about', 'contact']) {
      await expect(page.locator(`#${id}`)).toHaveCount(1);
    }
    await expect(links.last()).toHaveClass(/btn-primary/);
  });

  test('hero copy and calls to action', async ({ page }) => {
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveText('Engineering that connects the plant floor, the network, and the cloud.');
    await expect(page.locator('.status')).toHaveText('Systems online // 25 years in the field');
    await expect(page.locator('.hero-sub')).toHaveText(
      'AI engineering, IoT prototyping, systems automation, and production process optimization — for operations teams and product builders alike. Backed by 25 years as a computer systems engineer.',
    );
    await expect(page.getByRole('link', { name: 'Start a conversation' })).toHaveAttribute('href', '#contact');
    await expect(page.getByRole('link', { name: 'See services' })).toHaveAttribute('href', '#services');
  });

  test('status line uses a CSS dot, not a text glyph', async ({ page }) => {
    await expect(page.locator('.status-dot')).toHaveAttribute('aria-hidden', 'true');
    expect(await page.locator('.status').textContent()).not.toContain('●');
  });

  test('section headings match the spec, in order', async ({ page }) => {
    await expect(page.locator('main h2')).toHaveText([
      'Four disciplines. One connected system.',
      "Where I've delivered.",
      'How I work.',
      'Systems in the field.',
      'Ari Friedman',
      "Tell me what you're building, or what needs fixing.",
    ]);
  });

  test('footer', async ({ page }) => {
    const footer = page.locator('.site-footer');
    await expect(footer.locator('p').first()).toHaveText('© 2026 Outcore Tech');
    await expect(footer.getByRole('navigation', { name: 'Footer' }).getByRole('link')).toHaveText([
      'Services', 'Industries', 'Work', 'About', 'Contact',
    ]);
    await expect(footer.locator('.footer-tag')).toHaveText('AI · IoT · Automation · Optimization');
  });
});
```

- [ ] **Step 7: Run the browser tests to verify they fail**

Run: `npx playwright test tests/metadata.spec.js tests/shell.spec.js`
Expected: FAIL. The robots and sitemap tests pass, and every test that loads `/` fails, because no `index.html` exists and the server answers with plain-text `Not found`.

- [ ] **Step 8: Create `site/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Outcore Tech — AI, IoT, Automation &amp; Process Optimization</title>
  <meta name="description" content="Outcore Tech: AI engineering, IoT prototyping, systems automation, and production process optimization, backed by 25 years of real-world systems work.">
  <meta name="color-scheme" content="light dark">
  <meta name="theme-color" content="#f3f2ee" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#0e1115" media="(prefers-color-scheme: dark)">
  <link rel="canonical" href="https://outcoretech.com/">
  <link rel="preload" href="assets/fonts/ibm-plex-sans-latin-var.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="assets/fonts/ibm-plex-mono-latin-400.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="assets/css/site.css">
  <link rel="icon" href="assets/img/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="assets/img/favicon.ico" sizes="32x32">
  <link rel="apple-touch-icon" href="assets/img/apple-touch-icon.png">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://outcoretech.com/">
  <meta property="og:site_name" content="Outcore Tech">
  <meta property="og:locale" content="en_US">
  <meta property="og:title" content="Outcore Tech — AI, IoT, Automation &amp; Process Optimization">
  <meta property="og:description" content="Outcore Tech: AI engineering, IoT prototyping, systems automation, and production process optimization, backed by 25 years of real-world systems work.">
  <meta property="og:image" content="https://outcoretech.com/assets/img/og-image.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Outcore Tech — engineering from sensor to cloud">
  <meta name="twitter:card" content="summary_large_image">
  <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": "https://outcoretech.com/#org",
      "name": "Outcore Tech",
      "url": "https://outcoretech.com/",
      "description": "Outcore Tech: AI engineering, IoT prototyping, systems automation, and production process optimization, backed by 25 years of real-world systems work.",
      "logo": "https://outcoretech.com/assets/img/apple-touch-icon.png",
      "founder": {
        "@type": "Person",
        "name": "Ari Friedman",
        "jobTitle": "Computer Systems Engineer"
      },
      "knowsAbout": [
        "AI engineering", "LLM applications", "machine learning", "computer vision",
        "IoT prototyping", "systems automation", "production process optimization",
        "ESP32", "LoRaWAN", "PLC", "MES/SCADA", "HVAC control", "building automation",
        "real-time video", "fiber optics", "Python", "Azure", "AWS"
      ]
    }
  </script>
</head>
<body id="top">
  <a class="skip-link" href="#main">Skip to content</a>

  <header class="site-header">
    <div class="container header-inner">
      <a class="brand" href="#top">
        <svg class="mark" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
          <path class="mark-ring" d="M26.34 12.24A11 11 0 1 1 19.76 5.66"/>
          <circle class="mark-core" cx="16" cy="16" r="4.5"/>
          <path class="mark-trace" d="M19.2 12.8L26.5 5.5"/>
          <circle class="mark-node" cx="27" cy="5" r="2.25"/>
        </svg>
        <span class="brand-name">Outcore Tech</span>
      </a>
      <nav id="site-nav" class="site-nav" aria-label="Primary">
        <ul>
          <li><a href="#services">Services</a></li>
          <li><a href="#industries">Industries</a></li>
          <li><a href="#work">Work</a></li>
          <li><a href="#about">About</a></li>
          <li><a class="btn btn-primary nav-cta" href="#contact">Contact</a></li>
        </ul>
      </nav>
    </div>
  </header>

  <main id="main" tabindex="-1">
    <section class="hero" aria-labelledby="hero-title">
      <div class="container hero-inner">
        <div class="hero-copy">
          <p class="status"><span class="status-dot" aria-hidden="true"></span><span>Systems online <span aria-hidden="true">//</span> 25 years in the field</span></p>
          <h1 id="hero-title">Engineering that connects the plant floor, the network, and the cloud.</h1>
          <p class="hero-sub">AI engineering, IoT prototyping, systems automation, and production process optimization — for operations teams and product builders alike. Backed by 25 years as a computer systems engineer.</p>
          <div class="hero-actions">
            <a class="btn btn-primary" href="#contact">Start a conversation</a>
            <a class="btn btn-ghost" href="#services">See services <svg class="icon-arrow" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M2 8h11M9 4l4 4-4 4"/></svg></a>
          </div>
        </div>
      </div>
    </section>

    <section id="services" class="section" aria-labelledby="services-title">
      <div class="container">
        <div class="section-head">
          <p class="eyebrow"><span aria-hidden="true">// </span>Services</p>
          <h2 id="services-title">Four disciplines. <br>One connected system.</h2>
        </div>
      </div>
    </section>

    <section id="industries" class="section" aria-labelledby="industries-title">
      <div class="container">
        <div class="section-head">
          <p class="eyebrow"><span aria-hidden="true">// </span>Industries</p>
          <h2 id="industries-title">Where I've delivered.</h2>
        </div>
      </div>
    </section>

    <section id="how-i-work" class="section" aria-labelledby="process-title">
      <div class="container">
        <div class="section-head">
          <p class="eyebrow"><span aria-hidden="true">// </span>Process</p>
          <h2 id="process-title">How I work.</h2>
        </div>
      </div>
    </section>

    <section id="work" class="section" aria-labelledby="work-title">
      <div class="container">
        <div class="section-head">
          <p class="eyebrow"><span aria-hidden="true">// </span>Selected work</p>
          <h2 id="work-title">Systems in the field.</h2>
        </div>
      </div>
    </section>

    <section id="about" class="section" aria-labelledby="about-title">
      <div class="container">
        <div class="section-head">
          <p class="eyebrow"><span aria-hidden="true">// </span>About</p>
          <h2 id="about-title">Ari Friedman</h2>
        </div>
      </div>
    </section>

    <section id="contact" class="section section-contact" aria-labelledby="contact-title">
      <div class="container contact-grid">
        <div class="contact-intro">
          <p class="eyebrow"><span aria-hidden="true">// </span>Contact</p>
          <h2 id="contact-title">Tell me what you're building, or what needs fixing.</h2>
          <p class="contact-lead">Share a few details and I'll get back to you.</p>
        </div>
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <div class="container footer-inner">
      <p>© 2026 Outcore Tech</p>
      <nav aria-label="Footer">
        <ul>
          <li><a href="#services">Services</a></li>
          <li><a href="#industries">Industries</a></li>
          <li><a href="#work">Work</a></li>
          <li><a href="#about">About</a></li>
          <li><a href="#contact">Contact</a></li>
        </ul>
      </nav>
      <p class="footer-tag">AI · IoT · Automation · Optimization</p>
    </div>
  </footer>
</body>
</html>
```

- [ ] **Step 9: Append the shell styles to `site/assets/css/site.css`**

```css

/* ---------- Header ---------- */
.site-header {
  position: sticky;
  top: 0;
  z-index: 50;
  height: var(--header-h);
  background: var(--surface);
  background: color-mix(in srgb, var(--surface) 90%, transparent);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--line);
}
.header-inner {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.brand {
  display: inline-flex;
  align-items: center;
  gap: 0.625rem;
  min-height: 44px;
  color: var(--text);
  text-decoration: none;
  font-family: var(--font-mono);
  font-size: 0.9375rem;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  white-space: nowrap;
}
.mark { width: 28px; height: 28px; flex: none; }
.mark-ring { fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; }
.mark-core, .mark-node { fill: var(--accent); }
.mark-trace { fill: none; stroke: var(--accent); stroke-width: 2; stroke-linecap: round; }
.site-nav ul { display: flex; align-items: center; gap: 0.25rem; margin: 0; padding: 0; list-style: none; }
.site-nav a:not(.btn) {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 0 0.75rem;
  color: var(--text);
  font-size: 0.9375rem;
  text-decoration: none;
}
.site-nav a:not(.btn):hover { color: var(--accent-text); }
.nav-cta { margin-left: 0.5rem; }

/* ---------- Hero ---------- */
.hero {
  position: relative;
  overflow: hidden;
  padding: 3.5rem 0 3rem;
  border-bottom: 1px solid var(--line);
}
.hero::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(var(--line) 1px, transparent 1px),
    linear-gradient(90deg, var(--line) 1px, transparent 1px);
  background-size: 24px 24px;
  -webkit-mask-image: radial-gradient(ellipse at 70% 35%, #000 25%, transparent 75%);
  mask-image: radial-gradient(ellipse at 70% 35%, #000 25%, transparent 75%);
  opacity: 0.6;
}
.hero-inner { position: relative; display: grid; gap: 2.5rem; align-items: center; }
@media (min-width: 900px) {
  .hero { padding: 5.5rem 0 4rem; }
  .hero-inner { grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); }
}
.status {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  margin: 0 0 1.5rem;
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
  text-wrap: balance;
}
.status-dot {
  width: 8px;
  height: 8px;
  flex: none;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 25%, transparent);
}
.hero-sub { max-width: 38rem; margin: 1.25rem 0 2rem; font-size: 1.1875rem; color: var(--muted); }
.hero-actions { display: flex; flex-wrap: wrap; gap: 0.75rem; }
@media (max-width: 479.98px) {
  .status { font-size: 0.75rem; letter-spacing: 0.06em; }
  .hero-actions .btn { flex: 1 1 100%; }
}
.icon-arrow { display: inline-block; width: 1em; height: 1em; }
.icon-arrow path { fill: none; stroke: currentColor; stroke-width: 1.75; stroke-linecap: round; stroke-linejoin: round; }

/* ---------- Sections ---------- */
.section { padding: 4.5rem 0; border-bottom: 1px solid var(--line); }
@media (min-width: 900px) { .section { padding: 6rem 0; } }
.section-head { max-width: 46rem; margin-bottom: 2.5rem; }
.contact-lead { color: var(--muted); font-size: 1.125rem; }

/* ---------- Footer ---------- */
.site-footer { padding: 2rem 0; color: var(--muted); font-size: 0.9375rem; }
.footer-inner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem 2rem;
}
.site-footer p { margin: 0; }
.site-footer ul { display: flex; flex-wrap: wrap; margin: 0 -0.5rem; padding: 0; list-style: none; }
.site-footer a {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 0 0.5rem;
  color: var(--text);
  text-decoration: none;
}
.site-footer a:hover { color: var(--accent-text); }
.footer-tag {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
```

`#000` inside the `mask-image` gradients is a mask alpha value, not a colour, and is the single allowed exception to the token-only rule.

- [ ] **Step 10: Run the browser tests to verify they pass**

Run: `npx playwright test tests/metadata.spec.js tests/shell.spec.js`
Expected: all 16 tests pass.

- [ ] **Step 11: Run the static checks**

Run: `npm run validate:html && node tools/check-links.mjs && npm run test:unit`
Expected: html-validate prints nothing and exits 0, the link checker prints `All internal references resolve`, and all unit tests pass.

If html-validate reports a rule violation, fix the markup to satisfy it. The only acceptable config change is disabling a rule that contradicts an explicit spec requirement; in that case add it to `.htmlvalidate.json` under `"rules"` and record why in the commit message.

- [ ] **Step 12: Commit**

```bash
git add tools/check-links.mjs tools/check-links.test.mjs site/index.html site/robots.txt site/sitemap.xml site/assets/css/site.css tests/helpers.js tests/metadata.spec.js tests/shell.spec.js
git commit -m "feat: add page shell, metadata, section heads, and link checker" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01E9jrTVS6SFnYr1XeKBHVJs"
```

---

### Task 5: Hero schematic (decorative, time-limited motion)

**Files:**
- Create: `tests/hero.spec.js`
- Modify: `site/index.html` (hero), `site/assets/css/site.css` (append)

**Interfaces:**
- Consumes: `.hero-inner` and `.hero-copy` from Task 4.
- Produces: `svg.schematic` with `.sch-label` texts `SENSOR`, `CONTROLLER`, `EDGE`, `CLOUD` and a single `.sch-pulse` path. It also adds the global reduced-motion rule, which kills every animation and transition under `prefers-reduced-motion: reduce`.

- [ ] **Step 1: Write the failing test `tests/hero.spec.js`**

```js
import { test, expect } from '@playwright/test';

test('schematic is decorative and labels the four stages in order', async ({ page }) => {
  await page.goto('/');
  const svg = page.locator('.hero svg.schematic');
  await expect(svg).toHaveAttribute('aria-hidden', 'true');
  await expect(svg.locator('.sch-label')).toHaveText(['SENSOR', 'CONTROLLER', 'EDGE', 'CLOUD']);
});

test('pulse runs at most 5 seconds in total (WCAG 2.2.2)', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const timing = await page.locator('.sch-pulse').evaluate((el) => {
    const s = getComputedStyle(el);
    return {
      name: s.animationName,
      duration: s.animationDuration,
      delay: s.animationDelay,
      count: s.animationIterationCount,
    };
  });
  expect(timing.name).toBe('sch-pulse');
  expect(timing.count).not.toBe('infinite');
  const total = parseFloat(timing.delay) + parseFloat(timing.duration) * Number(timing.count);
  expect(total).toBeLessThanOrEqual(5);
});

test('pulse does not run under reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.sch-pulse')).toHaveCSS('animation-name', 'none');
});

test('schematic sits beside the copy on desktop and below it, smaller, on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  let copy = await page.locator('.hero-copy').boundingBox();
  let svg = await page.locator('.schematic').boundingBox();
  expect(svg.x).toBeGreaterThanOrEqual(copy.x + copy.width);

  await page.setViewportSize({ width: 375, height: 800 });
  copy = await page.locator('.hero-copy').boundingBox();
  svg = await page.locator('.schematic').boundingBox();
  expect(svg.y).toBeGreaterThanOrEqual(copy.y + copy.height);
  expect(svg.width).toBeLessThanOrEqual(360);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx playwright test tests/hero.spec.js`
Expected: FAIL, 4 tests. Each one times out or finds no element for `.schematic` or `.sch-pulse`.

- [ ] **Step 3: Add the schematic to `site/index.html`**

Insert this immediately after the closing `</div>` of `<div class="hero-copy">`, still inside `<div class="container hero-inner">`:

```html
        <svg class="schematic" viewBox="0 0 480 320" aria-hidden="true" focusable="false">
          <path class="sch-trace" d="M176 52H304"/>
          <path class="sch-trace" d="M384 80V240"/>
          <path class="sch-trace" d="M304 268H176"/>
          <path class="sch-trace" d="M96 80V132H150"/>
          <path class="sch-trace" d="M96 240V190H160"/>
          <path class="sch-trace" d="M384 160H320V200"/>
          <path class="sch-pulse" pathLength="100" d="M176 52H384V268H176"/>
          <circle class="sch-via" cx="150" cy="132" r="4"/>
          <circle class="sch-via" cx="160" cy="190" r="4"/>
          <circle class="sch-via" cx="320" cy="200" r="4"/>
          <circle class="sch-pad" cx="240" cy="52" r="3"/>
          <circle class="sch-pad" cx="384" cy="160" r="3"/>
          <circle class="sch-pad" cx="240" cy="268" r="3"/>
          <g class="sch-node">
            <rect x="16" y="24" width="160" height="56" rx="6"/>
            <text class="sch-index" x="28" y="42">01</text>
            <text class="sch-label" x="96" y="60" text-anchor="middle">SENSOR</text>
          </g>
          <g class="sch-node">
            <rect x="304" y="24" width="160" height="56" rx="6"/>
            <text class="sch-index" x="316" y="42">02</text>
            <text class="sch-label" x="384" y="60" text-anchor="middle">CONTROLLER</text>
          </g>
          <g class="sch-node">
            <rect x="304" y="240" width="160" height="56" rx="6"/>
            <text class="sch-index" x="316" y="258">03</text>
            <text class="sch-label" x="384" y="276" text-anchor="middle">EDGE</text>
          </g>
          <g class="sch-node">
            <rect x="16" y="240" width="160" height="56" rx="6"/>
            <text class="sch-index" x="28" y="258">04</text>
            <text class="sch-label" x="96" y="276" text-anchor="middle">CLOUD</text>
          </g>
        </svg>
```

The pulse path runs underneath the node rectangles, which are drawn after it, so the rectangles mask it. It is visible only on the three exposed trace segments.

- [ ] **Step 4: Append the schematic styles to `site/assets/css/site.css`**

```css

/* ---------- Hero schematic (decorative; motion capped at 4.9 s, off under reduced motion) ---------- */
.schematic { width: 100%; max-width: 520px; height: auto; justify-self: center; }
@media (max-width: 719.98px) { .schematic { max-width: 360px; } }
.sch-trace { fill: none; stroke: var(--muted); stroke-opacity: 0.45; stroke-width: 1.5; }
.sch-via { fill: var(--bg); stroke: var(--muted); stroke-opacity: 0.7; stroke-width: 1.5; }
.sch-pad { fill: var(--accent); }
.sch-node rect { fill: var(--surface); stroke: var(--muted); stroke-opacity: 0.6; stroke-width: 1.5; }
.sch-label { font: 500 13px var(--font-mono); letter-spacing: 0.12em; fill: var(--text); }
.sch-index { font: 400 10px var(--font-mono); letter-spacing: 0.1em; fill: var(--muted); }
.sch-pulse {
  fill: none;
  stroke: var(--accent);
  stroke-width: 3;
  stroke-linecap: round;
  stroke-dasharray: 6 200;
  stroke-dashoffset: 6;
}
@media (prefers-reduced-motion: no-preference) {
  .sch-pulse { animation: sch-pulse 2.4s ease-in-out 0.1s 2; }
}
@keyframes sch-pulse {
  from { stroke-dashoffset: 6; }
  to { stroke-dashoffset: -100; }
}

/* ---------- Reduced motion: nothing moves ---------- */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
```

The dash is 6 units long on a path normalised to 100. At offset 6 it sits just before the start, and at −100 just past the end, so it is invisible before and after the animation runs. The total run time is 0.1 s + 2 × 2.4 s = 4.9 s.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx playwright test tests/hero.spec.js tests/shell.spec.js`
Expected: all 11 tests pass.

- [ ] **Step 6: Validate and commit**

Run: `npm run validate:html && node tools/check-links.mjs`
Expected: exit 0, and `All internal references resolve`.

```bash
git add site/index.html site/assets/css/site.css tests/hero.spec.js
git commit -m "feat: add decorative hero schematic with time-limited pulse" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01E9jrTVS6SFnYr1XeKBHVJs"
```

---

### Task 6: Services, hero service strip, Industries, How I work

**Files:**
- Create: `tests/services.spec.js`
- Modify: `site/index.html` (the hero strip, and the `#services`, `#industries`, and `#how-i-work` sections), `site/assets/css/site.css` (append)

**Interfaces:**
- Consumes: the section skeletons from Task 4.
- Produces:
  - Card ids `ai`, `iot`, `automation`, `process`.
  - Classes `.grid`, `.grid-4`, `.card`, `.card-index`, `.service`, `.service-lead`, `.service-body`, `.ticks`, `.service-strip`, `.industry-list`, `.industry-name`, `.steps`, `.step`, `.step-index`. Task 7 reuses `.card` and `.card-index`.

- [ ] **Step 1: Write the failing test `tests/services.spec.js`**

```js
import { test, expect } from '@playwright/test';

const SERVICES = [
  {
    id: 'ai',
    index: '01',
    title: 'AI Engineering',
    lead: 'Practical AI built into real systems — not demos.',
    body: 'I build AI into the systems you already run: LLM apps and agents, machine learning on operational and sensor data, and computer vision on live video.',
    bullets: [
      'LLM apps and agents: chat assistants, document processing, and workflow automation',
      'Machine learning on operational and sensor data: prediction, anomaly detection, and forecasting',
      'Computer vision on real-time video: event detection, inspection, counting, and tracking',
      'Event-triggered automation at the edge, such as automated recording',
    ],
  },
  {
    id: 'iot',
    index: '02',
    title: 'IoT Prototyping',
    lead: 'From bench prototype to field pilot.',
    body: 'Connected devices built around ESP32, LoRaWAN, and Wi-Fi, with the sensors, controls, and interfaces your product or equipment needs.',
    bullets: [
      'ESP32-based controllers',
      'Touchscreen controls, timers, and scheduling',
      'LoRaWAN and Wi-Fi sensor networks',
      'Serial integration with existing equipment',
      'Matter smart-home integration',
    ],
  },
  {
    id: 'automation',
    index: '03',
    title: 'Systems Automation',
    lead: 'Equipment that runs on rules, not clipboards.',
    body: "PLCs, SCADA, building controls, and networks tied together, and to the cloud, so systems respond on their own and report what they're doing.",
    bullets: [
      'PLC and MES/SCADA integration',
      'HVAC, temperature, and ventilation control',
      'Building and home automation',
      'High-density networks, fiber optics, and real-time video distribution',
    ],
  },
  {
    id: 'process',
    index: '04',
    title: 'Production Process Optimization',
    lead: 'Instrument the process. Find the bottleneck. Automate the fix.',
    body: 'I replace paper, duplicate data entry, and blind spots with real-time data and automated workflows.',
    bullets: [
      'Paper systems and duplicative manual processes replaced completely',
      'Real-time metrics and driver feedback',
      'QR code scanning and passwordless driver authentication',
      'Monitoring, alerting, and centralized situational views',
      'Pick/pack, load/unload, and delivery workflows',
    ],
  },
];

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

for (const s of SERVICES) {
  test(`service card ${s.index}: ${s.title}`, async ({ page }) => {
    const card = page.locator(`#services article#${s.id}`);
    await expect(card.locator('.card-index')).toHaveText(s.index);
    await expect(card.locator('h3')).toHaveText(s.title);
    await expect(card.locator('.service-lead')).toHaveText(s.lead);
    await expect(card.locator('.service-body')).toHaveText(s.body);
    await expect(card.locator('.ticks li')).toHaveText(s.bullets);
  });
}

test('hero service strip links to each card using the short names', async ({ page }) => {
  const links = page.locator('.hero .service-strip a');
  await expect(links).toHaveText([
    '01 AI Engineering', '02 IoT Prototyping', '03 Systems Automation', '04 Process Optimization',
  ]);
  expect(await links.evaluateAll((as) => as.map((a) => a.getAttribute('href')))).toEqual([
    '#ai', '#iot', '#automation', '#process',
  ]);
});

test('industries list', async ({ page }) => {
  await expect(page.locator('#industries .industry-name')).toHaveText([
    'Manufacturing',
    'Distribution & logistics',
    'Industrial process',
    'Traffic control',
    'Building control & HVAC',
    'Home automation',
    'Public-private partnerships (3P)',
  ]);
});

test('how I work has the four approved steps', async ({ page }) => {
  const steps = page.locator('#how-i-work .step');
  await expect(steps.locator('h3')).toHaveText(['Assess', 'Prototype', 'Deploy', 'Support']);
  await expect(steps.locator('p:not(.step-index)')).toHaveText([
    'I learn the operation or product, map the systems and data, and agree with you on what "better" looks like, in terms you can measure.',
    'A working proof on real hardware and real data, built fast, so decisions rest on evidence rather than slides.',
    'Taken from prototype into the field, with the networking and monitoring to keep it running and documentation your team can own.',
    'Monitoring, tuning, and extensions as your operation or product changes.',
  ]);
});

test('service grid has 1, 2 and 4 columns at 375, 768 and 1280 px', async ({ page }) => {
  for (const [width, columns] of [[375, 1], [768, 2], [1280, 4]]) {
    await page.setViewportSize({ width, height: 900 });
    const tops = await page
      .locator('#services .service')
      .evaluateAll((cards) => cards.map((c) => Math.round(c.getBoundingClientRect().top)));
    expect(tops.filter((top) => top === tops[0]), `at ${width}px`).toHaveLength(columns);
  }
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx playwright test tests/services.spec.js`
Expected: FAIL, 8 tests (the 4 cards, the strip, industries, the steps, and the grid), because no cards, strip, lists, or steps exist yet.

- [ ] **Step 3: Replace the whole `<section id="services" …>…</section>` element in `site/index.html` with:**

```html
    <section id="services" class="section" aria-labelledby="services-title">
      <div class="container">
        <div class="section-head">
          <p class="eyebrow"><span aria-hidden="true">// </span>Services</p>
          <h2 id="services-title">Four disciplines. <br>One connected system.</h2>
        </div>
        <div class="grid grid-4">
          <article id="ai" class="card service">
            <p class="card-index">01</p>
            <h3>AI Engineering</h3>
            <p class="service-lead">Practical AI built into real systems — not demos.</p>
            <p class="service-body">I build AI into the systems you already run: LLM apps and agents, machine learning on operational and sensor data, and computer vision on live video.</p>
            <ul class="ticks">
              <li>LLM apps and agents: chat assistants, document processing, and workflow automation</li>
              <li>Machine learning on operational and sensor data: prediction, anomaly detection, and forecasting</li>
              <li>Computer vision on real-time video: event detection, inspection, counting, and tracking</li>
              <li>Event-triggered automation at the edge, such as automated recording</li>
            </ul>
          </article>
          <article id="iot" class="card service">
            <p class="card-index">02</p>
            <h3>IoT Prototyping</h3>
            <p class="service-lead">From bench prototype to field pilot.</p>
            <p class="service-body">Connected devices built around ESP32, LoRaWAN, and Wi-Fi, with the sensors, controls, and interfaces your product or equipment needs.</p>
            <ul class="ticks">
              <li>ESP32-based controllers</li>
              <li>Touchscreen controls, timers, and scheduling</li>
              <li>LoRaWAN and Wi-Fi sensor networks</li>
              <li>Serial integration with existing equipment</li>
              <li>Matter smart-home integration</li>
            </ul>
          </article>
          <article id="automation" class="card service">
            <p class="card-index">03</p>
            <h3>Systems Automation</h3>
            <p class="service-lead">Equipment that runs on rules, not clipboards.</p>
            <p class="service-body">PLCs, SCADA, building controls, and networks tied together, and to the cloud, so systems respond on their own and report what they're doing.</p>
            <ul class="ticks">
              <li>PLC and MES/SCADA integration</li>
              <li>HVAC, temperature, and ventilation control</li>
              <li>Building and home automation</li>
              <li>High-density networks, fiber optics, and real-time video distribution</li>
            </ul>
          </article>
          <article id="process" class="card service">
            <p class="card-index">04</p>
            <h3>Production Process Optimization</h3>
            <p class="service-lead">Instrument the process. Find the bottleneck. Automate the fix.</p>
            <p class="service-body">I replace paper, duplicate data entry, and blind spots with real-time data and automated workflows.</p>
            <ul class="ticks">
              <li>Paper systems and duplicative manual processes replaced completely</li>
              <li>Real-time metrics and driver feedback</li>
              <li>QR code scanning and passwordless driver authentication</li>
              <li>Monitoring, alerting, and centralized situational views</li>
              <li>Pick/pack, load/unload, and delivery workflows</li>
            </ul>
          </article>
        </div>
      </div>
    </section>
```

- [ ] **Step 4: Add the service strip to the hero**

Insert this immediately before the hero's closing `</section>` tag (the first `</section>` inside `<main>`), after the `</div>` that closes `.hero-inner`:

```html
      <div class="container">
        <ul class="service-strip">
          <li><a href="#ai"><span class="strip-index">01</span> AI Engineering</a></li>
          <li><a href="#iot"><span class="strip-index">02</span> IoT Prototyping</a></li>
          <li><a href="#automation"><span class="strip-index">03</span> Systems Automation</a></li>
          <li><a href="#process"><span class="strip-index">04</span> Process Optimization</a></li>
        </ul>
      </div>
```

- [ ] **Step 5: Replace the whole `<section id="industries" …>…</section>` element with:**

```html
    <section id="industries" class="section" aria-labelledby="industries-title">
      <div class="container">
        <div class="section-head">
          <p class="eyebrow"><span aria-hidden="true">// </span>Industries</p>
          <h2 id="industries-title">Where I've delivered.</h2>
        </div>
        <ul class="industry-list">
          <li><span class="industry-index" aria-hidden="true">01</span> <span class="industry-name">Manufacturing</span></li>
          <li><span class="industry-index" aria-hidden="true">02</span> <span class="industry-name">Distribution &amp; logistics</span></li>
          <li><span class="industry-index" aria-hidden="true">03</span> <span class="industry-name">Industrial process</span></li>
          <li><span class="industry-index" aria-hidden="true">04</span> <span class="industry-name">Traffic control</span></li>
          <li><span class="industry-index" aria-hidden="true">05</span> <span class="industry-name">Building control &amp; HVAC</span></li>
          <li><span class="industry-index" aria-hidden="true">06</span> <span class="industry-name">Home automation</span></li>
          <li><span class="industry-index" aria-hidden="true">07</span> <span class="industry-name">Public-private partnerships (3P)</span></li>
        </ul>
      </div>
    </section>
```

- [ ] **Step 6: Replace the whole `<section id="how-i-work" …>…</section>` element with:**

```html
    <section id="how-i-work" class="section" aria-labelledby="process-title">
      <div class="container">
        <div class="section-head">
          <p class="eyebrow"><span aria-hidden="true">// </span>Process</p>
          <h2 id="process-title">How I work.</h2>
        </div>
        <ol class="steps grid grid-4">
          <li class="step">
            <p class="step-index" aria-hidden="true">01</p>
            <h3>Assess</h3>
            <p>I learn the operation or product, map the systems and data, and agree with you on what "better" looks like, in terms you can measure.</p>
          </li>
          <li class="step">
            <p class="step-index" aria-hidden="true">02</p>
            <h3>Prototype</h3>
            <p>A working proof on real hardware and real data, built fast, so decisions rest on evidence rather than slides.</p>
          </li>
          <li class="step">
            <p class="step-index" aria-hidden="true">03</p>
            <h3>Deploy</h3>
            <p>Taken from prototype into the field, with the networking and monitoring to keep it running and documentation your team can own.</p>
          </li>
          <li class="step">
            <p class="step-index" aria-hidden="true">04</p>
            <h3>Support</h3>
            <p>Monitoring, tuning, and extensions as your operation or product changes.</p>
          </li>
        </ol>
      </div>
    </section>
```

- [ ] **Step 7: Append the styles to `site/assets/css/site.css`**

```css

/* ---------- Grid and cards ---------- */
.grid { display: grid; gap: 1rem; }
@media (min-width: 720px) { .grid-4 { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (min-width: 1080px) { .grid-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
.card {
  position: relative;
  padding: 1.5rem;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
}
.card::before,
.card::after {
  content: "";
  position: absolute;
  width: 10px;
  height: 10px;
  border: 0 solid var(--accent);
  pointer-events: none;
}
.card::before { top: -1px; left: -1px; border-top-width: 2px; border-left-width: 2px; border-top-left-radius: var(--radius); }
.card::after { right: -1px; bottom: -1px; border-right-width: 2px; border-bottom-width: 2px; border-bottom-right-radius: var(--radius); }
.card-index {
  margin: 0 0 1rem;
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent-text);
}

/* ---------- Services ---------- */
.service h3 { margin-bottom: 0.75rem; }
.service-lead { font-weight: 500; }
.service-body { color: var(--muted); }
.ticks {
  display: grid;
  gap: 0.5rem;
  margin-top: 1.25rem;
  padding-top: 1rem;
  border-top: 1px solid var(--line);
  font-size: 0.9375rem;
}
.ticks li { position: relative; padding-left: 1.25rem; }
.ticks li::before {
  content: "";
  position: absolute;
  top: 0.72em;
  left: 0;
  width: 8px;
  height: 2px;
  background: var(--accent);
}

/* ---------- Hero service strip ---------- */
.service-strip {
  position: relative;
  display: grid;
  margin-top: 3rem;
  border-top: 1px solid var(--line);
}
@media (min-width: 720px) { .service-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 1.5rem; } }
@media (min-width: 1080px) { .service-strip { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
.service-strip a {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 48px;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--line);
  color: var(--text);
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  text-decoration: none;
}
.service-strip a:hover { color: var(--accent-text); }
.strip-index { color: var(--accent-text); }

/* ---------- Industries ---------- */
.industry-list { display: grid; gap: 0.75rem; }
@media (min-width: 720px) {
  .industry-list { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .industry-list li:last-child:nth-child(odd) { grid-column: 1 / -1; }
}
@media (min-width: 1160px) {
  .industry-list { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .industry-list li:last-child:nth-child(odd) { grid-column: auto; }
  .industry-list li:last-child:nth-child(4n+3) { grid-column: span 2; }
}
.industry-list li {
  display: flex;
  align-items: baseline;
  gap: 0.875rem;
  padding: 1rem 1.25rem;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  font-weight: 500;
}
.industry-index { font-family: var(--font-mono); font-size: 0.8125rem; color: var(--accent-text); }

/* ---------- How I work ---------- */
.steps { gap: 2rem 1.5rem; }
.step { padding-top: 1.25rem; border-top: 2px solid var(--accent); }
.step-index {
  margin: 0 0 0.5rem;
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  font-weight: 500;
  letter-spacing: 0.12em;
  color: var(--accent-text);
}
.step p:last-child { margin: 0; color: var(--muted); }
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `npx playwright test tests/services.spec.js tests/shell.spec.js tests/hero.spec.js`
Expected: all 19 tests pass.

- [ ] **Step 9: Validate and commit**

Run: `npm run validate:html && node tools/check-links.mjs`
Expected: exit 0, and `All internal references resolve` (the strip's `#ai` … `#process` targets now exist).

```bash
git add site/index.html site/assets/css/site.css tests/services.spec.js
git commit -m "feat: add services, hero service strip, industries, and process sections" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01E9jrTVS6SFnYr1XeKBHVJs"
```

---

### Task 7: Selected work, About, and the copy guard

**Files:**
- Create: `tests/work-about.spec.js`, `tests/copy-guard.spec.js`
- Modify: `site/index.html` (the `#work` and `#about` sections), `site/assets/css/site.css` (append)

**Interfaces:**
- Consumes: `.card` and `.card-index` from Task 6.
- Produces: `.work-card`, `.tags`, `.work-industry`, `.work-detail`, `.about-grid`, `.about-bio`, `.about-role`, `.toolset`, `.tool-group`, and `.chips`.

- [ ] **Step 1: Write the failing tests**

`tests/work-about.spec.js`:
```js
import { test, expect } from '@playwright/test';

const WORK = [
  {
    title: 'Smart 36 kW pool heater controller',
    tags: ['IoT Prototyping', 'Systems Automation'],
    industry: null,
    challenge: 'Board-controlled heaters slammed the heating elements on and off, with no flexibility in how or when they ran.',
    built: 'A standalone Wi-Fi controller with soft ramp up/down, eco consumption modes, timers and scheduling, ambient temperature inputs, pump speed control and pump-state awareness, Matter smart-home integration, and a touchscreen interface.',
    result: "Controlled ramping instead of hard starts, running on the owner's schedule from the wall panel or any Matter app.",
  },
  {
    title: 'Warehouse and delivery logistics platform',
    tags: ['Process Optimization', 'Systems Automation'],
    industry: 'Distribution & logistics',
    challenge: 'Pick/pack, load/unload, and delivery ran on paper, with the same information keyed in more than once.',
    built: 'QR code scanning at every step, Google API integrations, passwordless driver sign-in, and real-time metrics with driver feedback.',
    result: 'Completely replaced the paper systems and the duplicated manual processes.',
  },
  {
    title: 'Quarry operations monitoring',
    tags: ['Systems Automation', 'Process Optimization'],
    industry: 'Industrial process',
    challenge: "Large industrial quarries ran SCADA networks with no centralized situational view or information repository, and remote locations couldn't drill into detail.",
    built: 'Monitoring, alerting, and process improvement across the SCADA networks with integrated real-time video feeds, plus a centralized situational view with drill-down from remote locations.',
    result: 'One operational picture, with the detail available from any location.',
  },
  {
    title: 'Edge-virtualized real-time video distribution',
    tags: ['AI Engineering', 'Systems Automation'],
    industry: 'Traffic control',
    challenge: 'Multiple large real-time video distribution and control systems were held back by parallel concurrency limits, with no conditional awareness or remote enablement.',
    built: 'An edge virtualization platform with compression and location awareness, monitoring, and AI event detection that triggers automated recording for situational awareness.',
    result: 'Removed the concurrency ceiling and added event-driven recording and remote enablement.',
  },
  {
    title: 'Automated building hot water',
    tags: ['IoT Prototyping', 'Systems Automation'],
    industry: 'Building control',
    challenge: 'Conventional hot water meant waiting at the tap or wasting energy keeping the lines hot.',
    built: 'Wi-Fi and cloud control of tankless units, valve controls, and recirculation pumps, with multiple temperature sensing points and fault detection.',
    result: 'Hot water available everywhere, without the waste, and fully configurable.',
  },
];

const TOOLSET = [
  ['AI & edge', ['LLM apps & agents', 'Machine learning', 'Computer vision', 'AI/ML event detection', 'Edge virtualization', 'Video compression']],
  ['Networks & video', ['High-density networks', 'Fiber optics', 'Real-time video sharing']],
  ['Field & controls', ['ESP32', 'PLC', 'Serial', 'MES/SCADA', 'LoRaWAN', 'Wi-Fi', 'Matter', 'HVAC', 'Temperature & ventilation control', 'Building control', 'Home automation']],
  ['Software & cloud', ['Python', 'Azure', 'AWS', 'Google APIs']],
];

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('there are exactly five project cards', async ({ page }) => {
  await expect(page.locator('#work .work-card')).toHaveCount(5);
});

WORK.forEach((w, i) => {
  test(`project ${i + 1}: ${w.title}`, async ({ page }) => {
    const card = page.locator('#work .work-card').nth(i);
    await expect(card.locator('.card-index')).toHaveText(`Project 0${i + 1}`);
    await expect(card.locator('h3')).toHaveText(w.title);
    await expect(card.locator('.tags li')).toHaveText(w.tags);
    if (w.industry) await expect(card.locator('.work-industry')).toHaveText(`Industry: ${w.industry}`);
    else await expect(card.locator('.work-industry')).toHaveCount(0);
    await expect(card.locator('dt')).toHaveText(['Challenge', 'Built', 'Result']);
    await expect(card.locator('dd')).toHaveText([w.challenge, w.built, w.result]);
  });
});

test('about: name, role and bio', async ({ page }) => {
  const about = page.locator('#about');
  await expect(about.locator('h2')).toHaveText('Ari Friedman');
  await expect(about.locator('.about-role')).toHaveText('Computer Systems Engineer · 25 years');
  await expect(about.locator('.about-bio p:not(.about-role)')).toHaveText(
    "I've spent 25 years as a computer systems engineer, building systems that have to work in the real world: high-density networks, fiber optics, and real-time video; PLCs, MES/SCADA, and building controls; ESP32 and LoRaWAN devices; Python, Azure, and AWS; and AI, from LLM apps to computer vision. Outcore Tech is how I bring that full stack to clients: one engineer who can take a problem from the sensor to the cloud and back.",
  );
});

test('about: four toolset groups with the approved chips', async ({ page }) => {
  const groups = page.locator('#about .tool-group');
  await expect(groups.locator('h3')).toHaveText(TOOLSET.map(([name]) => name));
  for (const [i, [, chips]] of TOOLSET.entries()) {
    await expect(groups.nth(i).locator('.chips li')).toHaveText(chips);
  }
});

test('project cards use 1 column below 900 px and 2 from 900 px', async ({ page }) => {
  for (const [width, columns] of [[375, 1], [1280, 2]]) {
    await page.setViewportSize({ width, height: 900 });
    const tops = await page
      .locator('#work .work-card')
      .evaluateAll((cards) => cards.map((c) => Math.round(c.getBoundingClientRect().top)));
    expect(tops.filter((top) => top === tops[0]), `at ${width}px`).toHaveLength(columns);
  }
});
```

`tests/copy-guard.spec.js`:
```js
import { test, expect } from '@playwright/test';

// Claims the review removed or that Ari never made (spec §8). None may reappear in page text.
const FORBIDDEN = [
  'data pipeline', 'operator', 'security', 'hardened', 'testimonial', 'clients include',
  'certified', 'award', 'guarantee', '24/7', 'years of experience with',
];

test('no unsupported claims appear anywhere in the page text', async ({ page }) => {
  await page.goto('/');
  const text = (await page.locator('body').innerText()).toLowerCase();
  for (const phrase of FORBIDDEN) expect(text, `found "${phrase}"`).not.toContain(phrase);
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx playwright test tests/work-about.spec.js tests/copy-guard.spec.js`
Expected: the 9 work/about tests fail because there are no cards, bio, or toolset yet. The copy guard passes, since nothing forbidden is there yet; it is a regression guard.

- [ ] **Step 3: Replace the whole `<section id="work" …>…</section>` element in `site/index.html` with:**

```html
    <section id="work" class="section" aria-labelledby="work-title">
      <div class="container">
        <div class="section-head">
          <p class="eyebrow"><span aria-hidden="true">// </span>Selected work</p>
          <h2 id="work-title">Systems in the field.</h2>
        </div>
        <div class="grid-work">
          <article class="card work-card">
            <p class="card-index">Project 01</p>
            <h3>Smart 36 kW pool heater controller</h3>
            <ul class="tags">
              <li>IoT Prototyping</li>
              <li>Systems Automation</li>
            </ul>
            <dl class="work-detail">
              <div><dt>Challenge</dt><dd>Board-controlled heaters slammed the heating elements on and off, with no flexibility in how or when they ran.</dd></div>
              <div><dt>Built</dt><dd>A standalone Wi-Fi controller with soft ramp up/down, eco consumption modes, timers and scheduling, ambient temperature inputs, pump speed control and pump-state awareness, Matter smart-home integration, and a touchscreen interface.</dd></div>
              <div><dt>Result</dt><dd>Controlled ramping instead of hard starts, running on the owner's schedule from the wall panel or any Matter app.</dd></div>
            </dl>
          </article>
          <article class="card work-card">
            <p class="card-index">Project 02</p>
            <h3>Warehouse and delivery logistics platform</h3>
            <ul class="tags">
              <li>Process Optimization</li>
              <li>Systems Automation</li>
            </ul>
            <p class="work-industry">Industry: Distribution &amp; logistics</p>
            <dl class="work-detail">
              <div><dt>Challenge</dt><dd>Pick/pack, load/unload, and delivery ran on paper, with the same information keyed in more than once.</dd></div>
              <div><dt>Built</dt><dd>QR code scanning at every step, Google API integrations, passwordless driver sign-in, and real-time metrics with driver feedback.</dd></div>
              <div><dt>Result</dt><dd>Completely replaced the paper systems and the duplicated manual processes.</dd></div>
            </dl>
          </article>
          <article class="card work-card">
            <p class="card-index">Project 03</p>
            <h3>Quarry operations monitoring</h3>
            <ul class="tags">
              <li>Systems Automation</li>
              <li>Process Optimization</li>
            </ul>
            <p class="work-industry">Industry: Industrial process</p>
            <dl class="work-detail">
              <div><dt>Challenge</dt><dd>Large industrial quarries ran SCADA networks with no centralized situational view or information repository, and remote locations couldn't drill into detail.</dd></div>
              <div><dt>Built</dt><dd>Monitoring, alerting, and process improvement across the SCADA networks with integrated real-time video feeds, plus a centralized situational view with drill-down from remote locations.</dd></div>
              <div><dt>Result</dt><dd>One operational picture, with the detail available from any location.</dd></div>
            </dl>
          </article>
          <article class="card work-card">
            <p class="card-index">Project 04</p>
            <h3>Edge-virtualized real-time video distribution</h3>
            <ul class="tags">
              <li>AI Engineering</li>
              <li>Systems Automation</li>
            </ul>
            <p class="work-industry">Industry: Traffic control</p>
            <dl class="work-detail">
              <div><dt>Challenge</dt><dd>Multiple large real-time video distribution and control systems were held back by parallel concurrency limits, with no conditional awareness or remote enablement.</dd></div>
              <div><dt>Built</dt><dd>An edge virtualization platform with compression and location awareness, monitoring, and AI event detection that triggers automated recording for situational awareness.</dd></div>
              <div><dt>Result</dt><dd>Removed the concurrency ceiling and added event-driven recording and remote enablement.</dd></div>
            </dl>
          </article>
          <article class="card work-card">
            <p class="card-index">Project 05</p>
            <h3>Automated building hot water</h3>
            <ul class="tags">
              <li>IoT Prototyping</li>
              <li>Systems Automation</li>
            </ul>
            <p class="work-industry">Industry: Building control</p>
            <dl class="work-detail">
              <div><dt>Challenge</dt><dd>Conventional hot water meant waiting at the tap or wasting energy keeping the lines hot.</dd></div>
              <div><dt>Built</dt><dd>Wi-Fi and cloud control of tankless units, valve controls, and recirculation pumps, with multiple temperature sensing points and fault detection.</dd></div>
              <div><dt>Result</dt><dd>Hot water available everywhere, without the waste, and fully configurable.</dd></div>
            </dl>
          </article>
        </div>
      </div>
    </section>
```

- [ ] **Step 4: Replace the whole `<section id="about" …>…</section>` element with:**

```html
    <section id="about" class="section" aria-labelledby="about-title">
      <div class="container">
        <p class="eyebrow"><span aria-hidden="true">// </span>About</p>
        <div class="about-grid">
          <div class="about-bio">
            <h2 id="about-title">Ari Friedman</h2>
            <p class="about-role">Computer Systems Engineer · 25 years</p>
            <p>I've spent 25 years as a computer systems engineer, building systems that have to work in the real world: high-density networks, fiber optics, and real-time video; PLCs, MES/SCADA, and building controls; ESP32 and LoRaWAN devices; Python, Azure, and AWS; and AI, from LLM apps to computer vision. Outcore Tech is how I bring that full stack to clients: one engineer who can take a problem from the sensor to the cloud and back.</p>
          </div>
          <div class="toolset">
            <div class="tool-group">
              <h3>AI &amp; edge</h3>
              <ul class="chips">
                <li>LLM apps &amp; agents</li>
                <li>Machine learning</li>
                <li>Computer vision</li>
                <li>AI/ML event detection</li>
                <li>Edge virtualization</li>
                <li>Video compression</li>
              </ul>
            </div>
            <div class="tool-group">
              <h3>Networks &amp; video</h3>
              <ul class="chips">
                <li>High-density networks</li>
                <li>Fiber optics</li>
                <li>Real-time video sharing</li>
              </ul>
            </div>
            <div class="tool-group">
              <h3>Field &amp; controls</h3>
              <ul class="chips">
                <li>ESP32</li>
                <li>PLC</li>
                <li>Serial</li>
                <li>MES/SCADA</li>
                <li>LoRaWAN</li>
                <li>Wi-Fi</li>
                <li>Matter</li>
                <li>HVAC</li>
                <li>Temperature &amp; ventilation control</li>
                <li>Building control</li>
                <li>Home automation</li>
              </ul>
            </div>
            <div class="tool-group">
              <h3>Software &amp; cloud</h3>
              <ul class="chips">
                <li>Python</li>
                <li>Azure</li>
                <li>AWS</li>
                <li>Google APIs</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
```

- [ ] **Step 5: Append the styles to `site/assets/css/site.css`**

```css

/* ---------- Selected work ---------- */
.grid-work { display: grid; gap: 1rem; }
@media (min-width: 900px) {
  .grid-work { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  /* An odd last card spans the row, with Challenge / Built / Result side by side. */
  .work-card:last-child:nth-child(odd) { grid-column: 1 / -1; }
  .work-card:last-child:nth-child(odd) .work-detail { grid-template-columns: repeat(3, minmax(0, 1fr)); column-gap: 2rem; }
}
.work-card h3 { margin-bottom: 0.75rem; }
.tags { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.75rem; }
.tags li {
  padding: 0.25rem 0.5rem;
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 2px;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.work-industry { margin: 0; font-family: var(--font-mono); font-size: 0.8125rem; color: var(--muted); }
.work-detail {
  display: grid;
  gap: 0.875rem;
  margin: 1.25rem 0 0;
  padding-top: 1rem;
  border-top: 1px solid var(--line);
}
.work-detail dt {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent-text);
}
.work-detail dd { margin: 0.25rem 0 0; }

/* ---------- About ---------- */
.about-grid { display: grid; gap: 2.5rem; }
@media (min-width: 900px) { .about-grid { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 4rem; } }
.about-role {
  font-family: var(--font-mono);
  font-size: 0.875rem;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}
.about-bio p:last-child { font-size: 1.125rem; }
.tool-group + .tool-group { margin-top: 1.75rem; }
.tool-group h3 {
  margin-bottom: 0.75rem;
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent-text);
}
.chips { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.chips li {
  padding: 0.375rem 0.625rem;
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 2px;
  font-family: var(--font-mono);
  font-size: 0.8125rem;
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx playwright test tests/work-about.spec.js tests/copy-guard.spec.js tests/shell.spec.js`
Expected: all 17 tests pass.

- [ ] **Step 7: Validate and commit**

Run: `npm run validate:html && node tools/check-links.mjs`
Expected: exit 0, and `All internal references resolve`.

```bash
git add site/index.html site/assets/css/site.css tests/work-about.spec.js tests/copy-guard.spec.js
git commit -m "feat: add selected work, about, and copy guard" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01E9jrTVS6SFnYr1XeKBHVJs"
```

---

### Task 8: Contact form markup, no-JS path, and the config guard

**Files:**
- Create: `tools/check-config.mjs`, `tools/check-config.test.mjs`, `tests/form-markup.spec.js`, `tests/form-nojs.spec.js`
- Modify: `site/index.html` (the `#contact` section), `site/assets/css/site.css` (append), `tests/helpers.js` (append)

**Interfaces:**
- Consumes: `.card` (Task 6) and the `#contact` skeleton (Task 4).
- Produces:
  - `form#contact-form`, which contains `button[type=submit]`, `p.form-status[role=status]`, and `div.form-error[role=alert]`.
  - `template#form-error-template` and `p#message-sent.form-sent`.
  - From `tools/check-config.mjs`: `checkFormConfig(html: string, { requireLiveKey?: boolean }): string[]`, plus `PLACEHOLDER_KEY` and `ALLOWED_REDIRECTS`.
  - From `tests/helpers.js`: `API`, `ACCESS_KEY`, `SUCCESS_TEXT`, `VISITOR`, and `fillForm(page, visitor?)`.

- [ ] **Step 1: Write the failing config test `tools/check-config.test.mjs`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { checkFormConfig, PLACEHOLDER_KEY } from './check-config.mjs';

const KEY = '98353593-5ec7-47a2-8dbe-5ffe29725846';
const PREVIEW = 'https://lz64.github.io/outcoretech/#message-sent';
const LIVE = 'https://outcoretech.com/#message-sent';
const page = ({ key = KEY, redirect = PREVIEW, extra = '', emailName = 'email' } = {}) =>
  `<form action="https://api.web3forms.com/submit" method="POST">
     <input type="hidden" name="access_key" value="${key}">
     <input type="hidden" name="redirect" value="${redirect}">
     <input id="f-email" name="${emailName}" type="email">${extra}
   </form>`;

test('accepts the live key with the preview redirect', () => {
  assert.deepEqual(checkFormConfig(page(), { requireLiveKey: true }), []);
});

test('accepts the production redirect', () => {
  assert.deepEqual(checkFormConfig(page({ redirect: LIVE }), { requireLiveKey: true }), []);
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test tools/check-config.test.mjs`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `./check-config.mjs`.

- [ ] **Step 3: Implement `tools/check-config.mjs`**

```js
// Guards the contact form's deploy-critical fields (spec §5.3): a real Web3Forms key,
// an allowed same-domain redirect, no replyto override, and an input named exactly "email".
import { readFile } from 'node:fs/promises';

export const PLACEHOLDER_KEY = '00000000-0000-0000-0000-000000000000';
export const ALLOWED_REDIRECTS = [
  'https://lz64.github.io/outcoretech/#message-sent',
  'https://outcoretech.com/#message-sent',
];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function inputValue(html, name) {
  const tag = html.match(new RegExp(`<input\\b[^>]*\\bname="${name}"[^>]*>`));
  if (!tag) return null;
  return tag[0].match(/\bvalue="([^"]*)"/)?.[1] ?? null;
}

export function checkFormConfig(html, { requireLiveKey = false } = {}) {
  const problems = [];
  const key = inputValue(html, 'access_key');
  if (!key || !UUID.test(key)) {
    problems.push(`access_key must be a UUID, found ${JSON.stringify(key)}`);
  } else if (requireLiveKey && key === PLACEHOLDER_KEY) {
    problems.push('access_key is the placeholder; set the real Web3Forms key');
  }
  const redirect = inputValue(html, 'redirect');
  if (!ALLOWED_REDIRECTS.includes(redirect)) {
    problems.push(`redirect must be one of ${ALLOWED_REDIRECTS.join(' | ')}, found ${JSON.stringify(redirect)}`);
  }
  if (/\bname="replyto"/i.test(html)) {
    problems.push('remove the replyto field: Web3Forms uses the email field as Reply-To');
  }
  if (!/<input\b[^>]*\bname="email"/.test(html)) {
    problems.push('the email input must be named exactly "email"');
  }
  return problems;
}

if (import.meta.main) {
  const html = await readFile('site/index.html', 'utf8');
  const problems = checkFormConfig(html, { requireLiveKey: process.argv.includes('--require-live-key') });
  for (const problem of problems) console.log(`FORM CONFIG ${problem}`);
  console.log(problems.length ? `${problems.length} form config problem(s)` : 'Form config OK');
  process.exitCode = problems.length ? 1 : 0;
}
```

- [ ] **Step 4: Run it: seven pass, one still fails**

Run: `node --test tools/check-config.test.mjs`
Expected: `ℹ pass 7`, `ℹ fail 1`. The failing test is `site/index.html passes with a live key`. The form doesn't exist yet, so it reports three problems: `access_key must be a UUID, found null`, the missing redirect, and the missing `email` input.

- [ ] **Step 5: Append the form helpers to `tests/helpers.js`**

```js

export const API = 'https://api.web3forms.com/submit';
export const ACCESS_KEY = '98353593-5ec7-47a2-8dbe-5ffe29725846';
export const SUCCESS_TEXT = "Thanks — your message is on its way. I'll be in touch soon.";
export const VISITOR = {
  name: 'Test Visitor',
  email: 'visitor@example.com',
  company: 'Example Co',
  service: 'IoT Prototyping',
  message: 'We need a LoRaWAN sensor pilot across three buildings.',
};

export async function fillForm(page, visitor = VISITOR) {
  await page.getByLabel('Name', { exact: true }).fill(visitor.name);
  await page.getByLabel('Email', { exact: true }).fill(visitor.email);
  await page.getByLabel('Company (optional)').fill(visitor.company);
  await page.getByLabel('What do you need help with?').selectOption(visitor.service);
  await page.getByLabel('Message').fill(visitor.message);
}
```

- [ ] **Step 6: Write the failing browser tests**

`tests/form-markup.spec.js`:
```js
import { test, expect } from '@playwright/test';
import { ACCESS_KEY, SUCCESS_TEXT } from './helpers.js';

const REDIRECT = /^https:\/\/(lz64\.github\.io\/outcoretech|outcoretech\.com)\/#message-sent$/;

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('form posts to Web3Forms', async ({ page }) => {
  const form = page.locator('form#contact-form');
  await expect(form).toHaveAttribute('action', 'https://api.web3forms.com/submit');
  await expect(form).toHaveAttribute('method', 'POST');
});

test('hidden fields carry the key, subject, sender name and a same-domain redirect', async ({ page }) => {
  const hidden = (name) => page.locator(`#contact-form input[type="hidden"][name="${name}"]`);
  await expect(hidden('access_key')).toHaveValue(ACCESS_KEY);
  await expect(hidden('subject')).toHaveValue('New inquiry – Outcore Tech');
  await expect(hidden('from_name')).toHaveValue('Outcore Tech website');
  await expect(hidden('redirect')).toHaveValue(REDIRECT);
  await expect(page.locator('#contact-form [name="replyto"]')).toHaveCount(0);
});

test('honeypot is a hidden checkbox that keyboard users cannot reach', async ({ page }) => {
  const trap = page.locator('#contact-form input[name="botcheck"]');
  await expect(trap).toHaveAttribute('type', 'checkbox');
  await expect(trap).toHaveAttribute('hidden', '');
  await expect(trap).toHaveAttribute('tabindex', '-1');
  await expect(trap).toHaveAttribute('autocomplete', 'off');
  await expect(trap).toBeHidden();
});

test('visible fields use the spec names, types, limits and autocomplete', async ({ page }) => {
  const props = (locator) =>
    locator.evaluate((el) => ({
      name: el.name,
      type: el.type,
      autocomplete: el.getAttribute('autocomplete'),
      minLength: el.minLength,
      maxLength: el.maxLength,
      required: el.required,
    }));
  expect(await props(page.getByLabel('Name', { exact: true }))).toEqual({
    name: 'name', type: 'text', autocomplete: 'name', minLength: -1, maxLength: 100, required: true,
  });
  expect(await props(page.getByLabel('Email', { exact: true }))).toEqual({
    name: 'email', type: 'email', autocomplete: 'email', minLength: -1, maxLength: 254, required: true,
  });
  expect(await props(page.getByLabel('Company (optional)'))).toEqual({
    name: 'company', type: 'text', autocomplete: 'organization', minLength: -1, maxLength: 120, required: false,
  });
  expect(await props(page.getByLabel('Message'))).toEqual({
    name: 'message', type: 'textarea', autocomplete: null, minLength: 10, maxLength: 5000, required: true,
  });
  await expect(page.getByLabel('Message')).toHaveAttribute('rows', '6');
});

test('service select starts on a disabled placeholder so "required" is enforced', async ({ page }) => {
  const select = page.getByLabel('What do you need help with?');
  await expect(select).toHaveAttribute('name', 'service');
  await expect(select.locator('option')).toHaveText([
    'Choose one…', 'AI Engineering', 'IoT Prototyping', 'Systems Automation',
    'Production Process Optimization', 'Not sure yet',
  ]);
  const placeholder = select.locator('option').first();
  await expect(placeholder).toHaveAttribute('value', '');
  await expect(placeholder).toHaveAttribute('disabled', '');
  expect(await select.evaluate((s) => s.required && s.validity.valueMissing)).toBe(true);
});

test('button, privacy note and empty live regions', async ({ page }) => {
  await expect(page.locator('#contact-form button[type="submit"]')).toHaveText('Send message');
  await expect(page.locator('.form-privacy')).toHaveText(
    "I'll use these details only to reply to you. The form is delivered by Web3Forms. This site sets no cookies and uses no analytics.",
  );
  await expect(page.locator('#contact-form .form-status')).toHaveAttribute('role', 'status');
  await expect(page.locator('#contact-form .form-status')).toBeEmpty();
  await expect(page.locator('#contact-form .form-error')).toHaveAttribute('role', 'alert');
  await expect(page.locator('#contact-form .form-error')).toBeEmpty();
});

test('the contact address is not visible anywhere on load', async ({ page }) => {
  await expect(page.getByText('contact@outcoretech.com')).toHaveCount(0);
});

test('the no-JS confirmation shows only when #message-sent is targeted', async ({ page }) => {
  const sent = page.locator('#message-sent');
  await expect(sent).toBeHidden();
  await page.goto('/#message-sent');
  await expect(sent).toBeVisible();
  await expect(sent).toHaveText(SUCCESS_TEXT);
});

test('form layout holds at 320 px with a long unbroken company name', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.getByLabel('Company (optional)').fill('X'.repeat(120));
  // Scoped to the contact section: the header only collapses below 720 px from Task 10;
  // the page-wide 320 px check lives in tests/layout-a11y.spec.js (Task 12).
  const overflow = await page.locator('#contact').evaluate((el) => el.scrollWidth - el.clientWidth);
  expect(overflow).toBe(0);
});
```

`tests/form-nojs.spec.js`:
```js
import { test, expect } from '@playwright/test';
import { API, ACCESS_KEY, VISITOR, fillForm } from './helpers.js';

// With JS off, Chromium's smooth scrolling never settles for Playwright's click stability check,
// and spec §6 runs the no-JS form check at 375 px.
test.use({ javaScriptEnabled: false, reducedMotion: 'reduce', viewport: { width: 375, height: 800 } });

test('without JS the form POSTs natively and the confirmation appears', async ({ page, baseURL }) => {
  let posted = null;
  await page.route(API, async (route) => {
    posted = Object.fromEntries(new URLSearchParams(route.request().postData()));
    await route.fulfill({ status: 303, headers: { location: `${baseURL}/#message-sent` } });
  });
  await page.goto('/');
  await fillForm(page);
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.locator('#message-sent')).toBeVisible();
  expect(posted).toEqual({
    access_key: ACCESS_KEY,
    subject: 'New inquiry – Outcore Tech',
    from_name: 'Outcore Tech website',
    redirect: expect.stringMatching(/#message-sent$/),
    name: VISITOR.name,
    email: VISITOR.email,
    company: VISITOR.company,
    service: VISITOR.service,
    message: VISITOR.message,
  });
});

test('without JS an incomplete form is blocked by native validation', async ({ page }) => {
  let requests = 0;
  await page.route(API, (route) => {
    requests += 1;
    return route.abort();
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Send message' }).click();
  await page.waitForTimeout(500);
  expect(requests).toBe(0);
  await expect(page.locator('#message-sent')).toBeHidden();
});
```

- [ ] **Step 7: Run them to verify they fail**

Run: `npx playwright test tests/form-markup.spec.js tests/form-nojs.spec.js`
Expected: FAIL, 10 of 11. Every test that needs the form times out on the missing `#contact-form`, its labels, or the Send button. Only the contact-address test passes, since there is nothing to find yet.

- [ ] **Step 8: Replace the whole `<section id="contact" …>…</section>` element in `site/index.html` with:**

```html
    <section id="contact" class="section section-contact" aria-labelledby="contact-title">
      <div class="container contact-grid">
        <div class="contact-intro">
          <p class="eyebrow"><span aria-hidden="true">// </span>Contact</p>
          <h2 id="contact-title">Tell me what you're building, or what needs fixing.</h2>
          <p class="contact-lead">Share a few details and I'll get back to you.</p>
        </div>
        <div class="card contact-panel">
          <p id="message-sent" class="form-sent" tabindex="-1">Thanks — your message is on its way. I'll be in touch soon.</p>
          <form id="contact-form" class="contact-form" action="https://api.web3forms.com/submit" method="POST">
            <input type="hidden" name="access_key" value="98353593-5ec7-47a2-8dbe-5ffe29725846">
            <input type="hidden" name="subject" value="New inquiry – Outcore Tech">
            <input type="hidden" name="from_name" value="Outcore Tech website">
            <input type="hidden" name="redirect" value="https://lz64.github.io/outcoretech/#message-sent">
            <!-- [html-validate-disable-next input-attributes, valid-autocomplete -- spec §5.3 requires this exact honeypot markup] -->
            <input type="checkbox" name="botcheck" hidden tabindex="-1" autocomplete="off">
            <div class="field">
              <label for="f-name">Name</label>
              <input id="f-name" name="name" type="text" autocomplete="name" maxlength="100" required>
            </div>
            <div class="field">
              <label for="f-email">Email</label>
              <input id="f-email" name="email" type="email" autocomplete="email" maxlength="254" required>
            </div>
            <div class="field">
              <label for="f-company">Company <span class="optional">(optional)</span></label>
              <input id="f-company" name="company" type="text" autocomplete="organization" maxlength="120">
            </div>
            <div class="field">
              <label for="f-service">What do you need help with?</label>
              <select id="f-service" name="service" required>
                <option value="" disabled selected>Choose one…</option>
                <option>AI Engineering</option>
                <option>IoT Prototyping</option>
                <option>Systems Automation</option>
                <option>Production Process Optimization</option>
                <option>Not sure yet</option>
              </select>
            </div>
            <div class="field">
              <label for="f-message">Message</label>
              <textarea id="f-message" name="message" rows="6" minlength="10" maxlength="5000" required></textarea>
            </div>
            <button type="submit" class="btn btn-primary">Send message</button>
            <p class="form-privacy">I'll use these details only to reply to you. The form is delivered by Web3Forms. This site sets no cookies and uses no analytics.</p>
            <p class="form-status" role="status"></p>
            <div class="form-error" role="alert"></div>
          </form>
          <template id="form-error-template">Your message didn't go through. Please try again, or email <a href="mailto:contact@outcoretech.com">contact@outcoretech.com</a>.</template>
        </div>
      </div>
    </section>
```

- [ ] **Step 9: Append the contact styles to `site/assets/css/site.css`**

```css

/* ---------- Contact ---------- */
.contact-grid { display: grid; gap: 2.5rem; }
@media (min-width: 900px) {
  .contact-grid { grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr); align-items: start; gap: 4rem; }
}
.contact-form { display: grid; gap: 1.125rem; }
.field { display: grid; gap: 0.375rem; }
.field label { font-size: 0.9375rem; font-weight: 500; }
.optional { font-weight: 400; color: var(--muted); }
.field input,
.field select,
.field textarea {
  width: 100%;
  min-width: 0;
  min-height: 44px;
  padding: 0.625rem 0.75rem;
  background: var(--surface-2);
  border: 1px solid var(--field-border);
  border-radius: var(--radius);
  color: var(--text);
  font: inherit;
  font-size: 1rem;
  line-height: 1.4;
}
.field textarea { min-height: 9rem; resize: vertical; }
.field :user-invalid { border-color: var(--danger); }
.contact-form .btn { justify-self: start; }
.form-privacy { margin: 0; font-size: 0.8125rem; color: var(--muted); }
.form-status,
.form-error,
.form-sent {
  margin: 0;
  padding: 0.75rem 1rem;
  background: var(--surface-2);
  border-left: 3px solid var(--accent);
  border-radius: 0 var(--radius) var(--radius) 0;
}
.form-error { color: var(--danger); border-left-color: var(--danger); }
.form-error a { color: inherit; text-decoration: underline; }
/* Keep the live regions rendered (in the accessibility tree) while empty so later text is announced;
   the negative margin cancels the grid gap an empty region would otherwise add. */
.form-status:empty,
.form-error:empty { margin-top: -1.125rem; padding: 0; border: 0; background: none; }
.form-sent { margin-bottom: 1.25rem; }
.form-sent:not(:target) { display: none; }
```

- [ ] **Step 10: Run the tests to verify they pass**

Run: `npx playwright test tests/form-markup.spec.js tests/form-nojs.spec.js && node --test tools/check-config.test.mjs`
Expected: the 11 browser tests pass, and the config test reports `ℹ pass 8`, `ℹ fail 0`.

The fulfilled 303 is followed natively. If the no-JS click times out with "element is not stable", check that `form-nojs.spec.js` sets `reducedMotion: 'reduce'`: with JS off, smooth scrolling never settles for Playwright's click.

- [ ] **Step 11: Run every static check**

Run: `npm run check`
Expected: every unit test passes; html-validate exits 0; `Contrast contract met`; `All internal references resolve`; `Form config OK`.

- [ ] **Step 12: Commit**

```bash
git add tools/check-config.mjs tools/check-config.test.mjs site/index.html site/assets/css/site.css tests/helpers.js tests/form-markup.spec.js tests/form-nojs.spec.js
git commit -m "feat: add contact form with no-JS confirmation and form config guard" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01E9jrTVS6SFnYr1XeKBHVJs"
```

---

### Task 9: Form enhancement (`site.js`): JSON submit, success and failure states, timeout

**Files:**
- Create: `site/assets/js/site.js`, `tests/form-js.spec.js`
- Modify: `site/index.html` (add the script tag)

**Interfaces:**
- Consumes: the form structure from Task 8 (`#contact-form`, `.form-status`, `.form-error`, `#form-error-template`).
- Produces: `site/assets/js/site.js`, an IIFE containing `send(url, data): Promise<boolean>` and `initContactForm()`. Task 10 replaces the whole file with one that adds `initNav()`.

- [ ] **Step 1: Write the failing test `tests/form-js.spec.js`**

```js
import { test, expect } from '@playwright/test';
import { API, ACCESS_KEY, SUCCESS_TEXT, VISITOR, fillForm } from './helpers.js';

const CORS = { 'access-control-allow-origin': '*' };
const json = (status, body) => ({ status, headers: CORS, contentType: 'application/json', body: JSON.stringify(body) });
const ERROR_TEXT = "Your message didn't go through. Please try again, or email contact@outcoretech.com.";

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('success: sends JSON without the redirect field, then confirms and clears the form', async ({ page }) => {
  let request = null;
  await page.route(API, async (route) => {
    request = route.request();
    await route.fulfill(json(200, { success: true, message: 'Email sent successfully!' }));
  });
  await fillForm(page);
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.locator('.form-status')).toHaveText(SUCCESS_TEXT);
  expect(request.method()).toBe('POST');
  expect(request.headers()['content-type']).toBe('application/json');
  expect(request.headers()['accept']).toBe('application/json');
  expect(request.postDataJSON()).toEqual({
    access_key: ACCESS_KEY,
    subject: 'New inquiry – Outcore Tech',
    from_name: 'Outcore Tech website',
    name: VISITOR.name,
    email: VISITOR.email,
    company: VISITOR.company,
    service: VISITOR.service,
    message: VISITOR.message,
  });
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Message')).toHaveValue('');
  await expect(page.getByLabel('What do you need help with?')).toHaveValue('');
  await expect(page.locator('.form-error')).toBeEmpty();
  await expect(page).toHaveURL(/127\.0\.0\.1:4173\/$/);
});

test('the button says Sending… and is disabled while the request is in flight', async ({ page }) => {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  await page.route(API, async (route) => {
    await gate;
    await route.fulfill(json(200, { success: true }));
  });
  await fillForm(page);
  const button = page.locator('#contact-form button[type="submit"]');
  await button.click();
  await expect(button).toHaveText('Sending…');
  await expect(button).toBeDisabled();
  release();
  await expect(button).toHaveText('Send message');
  await expect(button).toBeEnabled();
});

const FAILURES = {
  'HTTP 500 with an error body': (route) => route.fulfill(json(500, { statusCode: 500, error: 'Internal' })),
  'HTTP 429 rate limit': (route) => route.fulfill(json(429, { success: false, message: 'Too many requests' })),
  'HTTP 403 HTML challenge page': (route) =>
    route.fulfill({ status: 403, headers: CORS, contentType: 'text/html', body: '<html>challenge</html>' }),
  'HTTP 200 with success false': (route) => route.fulfill(json(200, { success: false, message: 'Invalid key' })),
  'HTTP 200 with a non-JSON body': (route) =>
    route.fulfill({ status: 200, headers: CORS, contentType: 'text/plain', body: 'ok' }),
  'HTTP 200 with JSON null': (route) => route.fulfill(json(200, null)),
  'network failure': (route) => route.abort('failed'),
};

for (const [name, respond] of Object.entries(FAILURES)) {
  test(`failure (${name}) shows the error with a mailto link and keeps the input`, async ({ page }) => {
    await page.route(API, respond);
    await fillForm(page);
    await page.getByRole('button', { name: 'Send message' }).click();
    const error = page.locator('.form-error');
    await expect(error).toHaveText(ERROR_TEXT);
    await expect(error.getByRole('link', { name: 'contact@outcoretech.com' })).toHaveAttribute('href', 'mailto:contact@outcoretech.com');
    await expect(page.locator('.form-status')).toBeEmpty();
    await expect(page.getByLabel('Name', { exact: true })).toHaveValue(VISITOR.name);
    await expect(page.getByLabel('Message')).toHaveValue(VISITOR.message);
    await expect(page.locator('#contact-form button[type="submit"]')).toBeEnabled();
    await expect(page.locator('body')).not.toContainText('Invalid key');
    await expect(page.locator('body')).not.toContainText('Too many requests');
  });
}

test('a retry after a failure clears the error and confirms', async ({ page }) => {
  let calls = 0;
  await page.route(API, (route) => {
    calls += 1;
    return calls === 1 ? route.abort('failed') : route.fulfill(json(200, { success: true }));
  });
  await fillForm(page);
  const send = page.getByRole('button', { name: 'Send message' });
  await send.click();
  await expect(page.locator('.form-error')).not.toBeEmpty();
  await send.click();
  await expect(page.locator('.form-status')).toHaveText(SUCCESS_TEXT);
  await expect(page.locator('.form-error')).toBeEmpty();
});

test('an incomplete form sends nothing and focuses the first invalid field', async ({ page }) => {
  let calls = 0;
  await page.route(API, (route) => {
    calls += 1;
    return route.abort();
  });
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByLabel('Name', { exact: true })).toBeFocused();
  expect(calls).toBe(0);
});

test('a message shorter than 10 characters is rejected', async ({ page }) => {
  let calls = 0;
  await page.route(API, (route) => {
    calls += 1;
    return route.abort();
  });
  await fillForm(page, { ...VISITOR, message: '' });
  await page.getByLabel('Message').pressSequentially('too short');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByLabel('Message')).toBeFocused();
  expect(calls).toBe(0);
});

// Review Focus 1
test('double-clicking Send, Enter, or a second submit mid-flight sends exactly one request', async ({ page }) => {
  let calls = 0;
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  await page.route(API, async (route) => {
    calls += 1;
    await gate;
    await route.fulfill(json(200, { success: true }));
  });
  await fillForm(page);
  await page.locator('#contact-form button[type="submit"]').dblclick();
  await page.getByLabel('Name', { exact: true }).press('Enter');
  await page.locator('#contact-form').evaluate((form) => form.requestSubmit());
  release();
  await expect(page.locator('.form-status')).toHaveText(SUCCESS_TEXT);
  expect(calls).toBe(1);
});

// Review Focus 2
test('a request that never answers fails after 15 s and keeps the input', async ({ page }) => {
  await page.clock.install();
  await page.reload();
  await page.route(API, () => {}); // never fulfilled
  await fillForm(page);
  const button = page.locator('#contact-form button[type="submit"]');
  await button.click();
  await expect(button).toHaveText('Sending…');
  await page.clock.fastForward(15_000);
  await expect(page.locator('.form-error')).toHaveText(ERROR_TEXT);
  await expect(page.getByLabel('Message')).toHaveValue(VISITOR.message);
  await expect(button).toBeEnabled();
});

// Review Focus 3
test('non-ASCII input reaches the API byte-for-byte', async ({ page }) => {
  let body = null;
  await page.route(API, async (route) => {
    body = route.request().postDataJSON();
    await route.fulfill(json(200, { success: true }));
  });
  const visitor = {
    ...VISITOR,
    name: "José O'Brien",
    company: 'Müller & Søn',
    message: 'Sensors read 25 °C … 温度 🚀 — we need alerts.',
  };
  await fillForm(page, visitor);
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.locator('.form-status')).toHaveText(SUCCESS_TEXT);
  expect(body).toMatchObject({ name: visitor.name, company: visitor.company, message: visitor.message });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx playwright test tests/form-js.spec.js`
Expected: FAIL. With no JS attached, submit does a native POST, so the success, failure, and in-flight assertions fail. The validation tests may pass, because native validation blocks empty and short submissions without JS.

- [ ] **Step 3: Create `site/assets/js/site.js`**

```js
/* Outcore Tech — progressive enhancement only.
   Without this file the form falls back to a native POST (spec §5.3). */
(() => {
  'use strict';

  const SEND_TIMEOUT_MS = 15000;
  const SUCCESS_TEXT = "Thanks — your message is on its way. I'll be in touch soon.";

  // Resolves true only for an OK response whose JSON body has success === true (spec §5.3 item 2).
  async function send(url, data) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data),
        signal: controller.signal,
      });
      const body = await response.json();
      return response.ok && body !== null && typeof body === 'object' && body.success === true;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  function initContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;
    const button = form.querySelector('button[type="submit"]');
    const status = form.querySelector('.form-status');
    const error = form.querySelector('.form-error');
    const errorTemplate = document.getElementById('form-error-template');
    const idleLabel = button.textContent;
    let sending = false;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (sending || !form.reportValidity()) return;
      sending = true;
      status.textContent = '';
      error.replaceChildren();
      button.disabled = true;
      button.textContent = 'Sending…';

      const data = Object.fromEntries(new FormData(form));
      // The redirect field is for the no-JS fallback only; sent from fetch it makes the API
      // answer with a cross-origin redirect that reports a false failure (spec §5.3).
      delete data.redirect;

      const ok = await send(form.action, data);

      sending = false;
      button.disabled = false;
      button.textContent = idleLabel;
      if (ok) {
        form.reset();
        status.textContent = SUCCESS_TEXT;
      } else {
        error.replaceChildren(errorTemplate.content.cloneNode(true));
      }
    });
  }

  initContactForm();
})();
```

- [ ] **Step 4: Load the script from `site/index.html`**

Insert this in `<head>`, immediately after `<link rel="stylesheet" href="assets/css/site.css">`:

```html
  <script src="assets/js/site.js" defer></script>
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx playwright test tests/form-js.spec.js tests/form-markup.spec.js tests/form-nojs.spec.js`
Expected: all 26 tests pass (15 + 9 + 2).

- [ ] **Step 6: Run the static checks and commit**

Run: `npm run check`
Expected: every check passes.

```bash
git add site/assets/js/site.js site/index.html tests/form-js.spec.js
git commit -m "feat: submit the contact form with fetch, with timeout and failure states" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01E9jrTVS6SFnYr1XeKBHVJs"
```

---

### Task 10: Mobile navigation (JS toggle and the no-JS fallback)

**Files:**
- Create: `site/assets/css/nojs.css`, `tests/nav.spec.js`
- Modify: `site/index.html` (the toggle button and the noscript stylesheet), `site/assets/js/site.js` (replace the whole file), `site/assets/css/site.css` (append)

**Interfaces:**
- Consumes: `.header-inner`, `.brand`, and `nav#site-nav` from Task 4, and `initContactForm()` from Task 9.
- Produces: `button.nav-toggle[aria-expanded][aria-controls="site-nav"]`, placed immediately before `nav#site-nav`. The CSS relies on that adjacency: `.nav-toggle[aria-expanded="true"] + .site-nav`. Task 11 reuses the same header markup.

- [ ] **Step 1: Write the failing test `tests/nav.spec.js`**

```js
import { test, expect } from '@playwright/test';

const toggle = (page) => page.locator('.nav-toggle');
const nav = (page) => page.locator('#site-nav');

test.describe('desktop', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('links are inline and the menu button is hidden', async ({ page }) => {
    await page.goto('/');
    await expect(toggle(page)).toBeHidden();
    await expect(nav(page).getByRole('link', { name: 'Services' })).toBeVisible();
  });
});

test.describe('mobile with JS', () => {
  test.use({ viewport: { width: 375, height: 800 } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('the menu starts closed', async ({ page }) => {
    await expect(toggle(page)).toBeVisible();
    await expect(toggle(page)).toHaveText('Menu');
    await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle(page)).toHaveAttribute('aria-controls', 'site-nav');
    await expect(nav(page)).toBeHidden();
  });

  test('the button opens and closes the menu', async ({ page }) => {
    await toggle(page).click();
    await expect(toggle(page)).toHaveAttribute('aria-expanded', 'true');
    await expect(nav(page).getByRole('link', { name: 'Industries' })).toBeVisible();
    await toggle(page).click();
    await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');
    await expect(nav(page)).toBeHidden();
  });

  test('Escape closes the menu and returns focus to the button', async ({ page }) => {
    await toggle(page).click();
    await nav(page).getByRole('link', { name: 'Services' }).focus();
    await page.keyboard.press('Escape');
    await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle(page)).toBeFocused();
  });

  test('choosing a link closes the menu and navigates', async ({ page }) => {
    await toggle(page).click();
    await nav(page).getByRole('link', { name: 'Work' }).click();
    await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');
    await expect(page).toHaveURL(/#work$/);
  });

  test('growing to desktop width closes the menu', async ({ page }) => {
    await toggle(page).click();
    await page.setViewportSize({ width: 1024, height: 800 });
    await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');
    await page.setViewportSize({ width: 375, height: 800 });
    await expect(nav(page)).toBeHidden();
  });

  test('menu links are at least 44 px tall', async ({ page }) => {
    await toggle(page).click();
    for (const link of await nav(page).getByRole('link').all()) {
      expect((await link.boundingBox()).height).toBeGreaterThanOrEqual(44);
    }
  });

  test('loading the page causes no layout shift', async ({ page }) => {
    const cls = await page.evaluate(
      () =>
        new Promise((resolve) => {
          let total = 0;
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) if (!entry.hadRecentInput) total += entry.value;
          }).observe({ type: 'layout-shift', buffered: true });
          setTimeout(() => resolve(total), 1000);
        }),
    );
    expect(cls).toBeLessThan(0.05);
  });
});

test.describe('mobile without JS', () => {
  test.use({ viewport: { width: 375, height: 800 }, javaScriptEnabled: false });

  test('every nav link is visible and tall enough, and the menu button is hidden', async ({ page }) => {
    await page.goto('/');
    await expect(toggle(page)).toBeHidden();
    const links = nav(page).getByRole('link');
    await expect(links).toHaveCount(5);
    for (const link of await links.all()) {
      await expect(link).toBeVisible();
      expect((await link.boundingBox()).height).toBeGreaterThanOrEqual(44);
    }
    await expect(page.locator('.site-header')).toHaveCSS('position', 'static');
  });

  test('nav links are reachable by keyboard', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab'); // skip link
    await page.keyboard.press('Tab'); // brand
    await page.keyboard.press('Tab');
    await expect(nav(page).getByRole('link', { name: 'Services' })).toBeFocused();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx playwright test tests/nav.spec.js`
Expected: FAIL. At 375 px there is no `.nav-toggle` yet, and the links overflow the header.

- [ ] **Step 3: Add the toggle button and the no-JS stylesheet to `site/index.html`**

In `.header-inner`, insert this line between the closing `</a>` of `.brand` and `<nav id="site-nav" …>`:

```html
      <button type="button" class="nav-toggle" aria-expanded="false" aria-controls="site-nav">Menu</button>
```

In `<head>`, insert this immediately after `<link rel="stylesheet" href="assets/css/site.css">` (and before the script tag):

```html
  <noscript><link rel="stylesheet" href="assets/css/nojs.css"></noscript>
```

- [ ] **Step 4: Create `site/assets/css/nojs.css`**

```css
/* Loaded only when JavaScript is off (via <noscript>): the menu button can't work, so show the links. */
.nav-toggle { display: none !important; }

@media (max-width: 719.98px) {
  .site-header { position: static; height: auto; }
  .header-inner { flex-wrap: wrap; padding-block: 0.5rem; }
  .site-nav { display: block; position: static; width: 100%; background: none; border: 0; }
  .site-nav ul { flex-direction: row; flex-wrap: wrap; align-items: center; gap: 0 0.25rem; padding: 0; }
  .site-nav a:not(.btn) { padding: 0 0.5rem; border: 0; }
  .nav-cta { margin: 0 0 0 0.25rem; }
}
```

- [ ] **Step 5: Append the mobile nav styles to `site/assets/css/site.css`**

```css

/* ---------- Mobile nav (below 720 px); state lives in the button's aria-expanded ---------- */
.nav-toggle { display: none; }
@media (max-width: 719.98px) {
  .nav-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 44px;
    min-height: 44px;
    padding: 0 0.875rem;
    background: transparent;
    color: var(--text);
    border: 1px solid var(--field-border);
    border-radius: var(--radius);
    font: 500 0.875rem var(--font-mono);
    letter-spacing: 0.1em;
    text-transform: uppercase;
    cursor: pointer;
  }
  .site-nav {
    display: none;
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--surface);
    border-bottom: 1px solid var(--line);
  }
  .nav-toggle[aria-expanded="true"] + .site-nav { display: block; }
  .site-nav ul { flex-direction: column; align-items: stretch; gap: 0; padding: 0.5rem 16px 1rem; }
  .site-nav a:not(.btn) { display: flex; min-height: 48px; padding: 0; border-bottom: 1px solid var(--line); font-size: 1rem; }
  .nav-cta { display: flex; margin: 0.75rem 0 0; }
}
@media (min-width: 480px) and (max-width: 719.98px) {
  .site-nav ul { padding-inline: 24px; }
}
```

- [ ] **Step 6: Replace `site/assets/js/site.js` with the version that adds the nav**

```js
/* Outcore Tech — progressive enhancement only.
   Without this file the nav falls back to nojs.css and the form to a native POST (spec §3.1, §5.3). */
(() => {
  'use strict';

  const SEND_TIMEOUT_MS = 15000;
  const SUCCESS_TEXT = "Thanks — your message is on its way. I'll be in touch soon.";

  function initNav() {
    const toggle = document.querySelector('.nav-toggle');
    const nav = document.getElementById('site-nav');
    if (!toggle || !nav) return;
    const desktop = window.matchMedia('(min-width: 720px)');
    const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';
    const setOpen = (open) => toggle.setAttribute('aria-expanded', String(open));

    toggle.addEventListener('click', () => setOpen(!isOpen()));
    nav.addEventListener('click', (event) => {
      if (event.target.closest('a')) setOpen(false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && isOpen()) {
        setOpen(false);
        toggle.focus();
      }
    });
    desktop.addEventListener('change', (event) => {
      if (event.matches) setOpen(false);
    });
  }

  // Resolves true only for an OK response whose JSON body has success === true (spec §5.3 item 2).
  async function send(url, data) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data),
        signal: controller.signal,
      });
      const body = await response.json();
      return response.ok && body !== null && typeof body === 'object' && body.success === true;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  function initContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;
    const button = form.querySelector('button[type="submit"]');
    const status = form.querySelector('.form-status');
    const error = form.querySelector('.form-error');
    const errorTemplate = document.getElementById('form-error-template');
    const idleLabel = button.textContent;
    let sending = false;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (sending || !form.reportValidity()) return;
      sending = true;
      status.textContent = '';
      error.replaceChildren();
      button.disabled = true;
      button.textContent = 'Sending…';

      const data = Object.fromEntries(new FormData(form));
      // The redirect field is for the no-JS fallback only; sent from fetch it makes the API
      // answer with a cross-origin redirect that reports a false failure (spec §5.3).
      delete data.redirect;

      const ok = await send(form.action, data);

      sending = false;
      button.disabled = false;
      button.textContent = idleLabel;
      if (ok) {
        form.reset();
        status.textContent = SUCCESS_TEXT;
      } else {
        error.replaceChildren(errorTemplate.content.cloneNode(true));
      }
    });
  }

  initNav();
  initContactForm();
})();
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npx playwright test tests/nav.spec.js tests/shell.spec.js tests/form-js.spec.js`
Expected: all 32 tests pass (10 + 7 + 15).

- [ ] **Step 8: Run the static checks and commit**

Run: `npm run check`
Expected: every check passes.

```bash
git add site/index.html site/assets/css/site.css site/assets/css/nojs.css site/assets/js/site.js tests/nav.spec.js
git commit -m "feat: add mobile menu with no-JS fallback" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01E9jrTVS6SFnYr1XeKBHVJs"
```

---

### Task 11: Custom 404 page

**Files:**
- Create: `site/404.html`, `tests/not-found.spec.js`
- Modify: `site/assets/css/site.css` (append)

**Interfaces:**
- Consumes: the header and footer markup and classes (Tasks 4 and 10), `site.css`, `nojs.css`, and `site.js`.
- Produces: `site/404.html`. It uses root-absolute URLs only (spec §3.10) and is served by `tools/serve.mjs` and by GitHub Pages for any missing path.

- [ ] **Step 1: Write the failing test `tests/not-found.spec.js`**

```js
import { test, expect } from '@playwright/test';

test('a missing nested path returns the styled 404 page', async ({ page }) => {
  const response = await page.goto('/a/b/c');
  expect(response.status()).toBe(404);
  await expect(page).toHaveTitle('Page not found — Outcore Tech');
  await expect(page.locator('h1')).toHaveText("This page isn't on the network.");
  await expect(page.locator('.not-found .eyebrow')).toHaveText('404 // Signal lost');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(243, 242, 238)');
  await expect(page.locator('h1')).toHaveCSS('font-family', /IBM Plex Sans/);
  await expect(page.getByRole('link', { name: 'Back to outcoretech.com' })).toHaveAttribute('href', '/');
});

test('404 links are root-absolute so they work at any depth', async ({ page }) => {
  await page.goto('/services/old-page');
  const hrefs = await page
    .getByRole('navigation', { name: 'Primary' })
    .getByRole('link')
    .evaluateAll((links) => links.map((a) => a.getAttribute('href')));
  expect(hrefs).toEqual(['/#services', '/#industries', '/#work', '/#about', '/#contact']);
  await expect(page.locator('.site-header .brand')).toHaveAttribute('href', '/');
});

test('404 is not indexed and has no canonical, social tags, or JSON-LD', async ({ page }) => {
  await page.goto('/nope');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  await expect(page.locator('meta[property^="og:"]')).toHaveCount(0);
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
});

test('the 404 mobile menu works', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/x/y');
  await page.locator('.nav-toggle').click();
  await expect(page.locator('#site-nav').getByRole('link', { name: 'Contact' })).toBeVisible();
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx playwright test tests/not-found.spec.js`
Expected: FAIL. The status is 404, but the body is plain-text `Not found`, so the title, heading, and styles are missing.

- [ ] **Step 3: Create `site/404.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Page not found — Outcore Tech</title>
  <meta name="robots" content="noindex">
  <meta name="color-scheme" content="light dark">
  <link rel="stylesheet" href="/assets/css/site.css">
  <noscript><link rel="stylesheet" href="/assets/css/nojs.css"></noscript>
  <script src="/assets/js/site.js" defer></script>
  <link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="/assets/img/favicon.ico" sizes="32x32">
</head>
<body id="top">
  <a class="skip-link" href="#main">Skip to content</a>

  <header class="site-header">
    <div class="container header-inner">
      <a class="brand" href="/">
        <svg class="mark" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
          <path class="mark-ring" d="M26.34 12.24A11 11 0 1 1 19.76 5.66"/>
          <circle class="mark-core" cx="16" cy="16" r="4.5"/>
          <path class="mark-trace" d="M19.2 12.8L26.5 5.5"/>
          <circle class="mark-node" cx="27" cy="5" r="2.25"/>
        </svg>
        <span class="brand-name">Outcore Tech</span>
      </a>
      <button type="button" class="nav-toggle" aria-expanded="false" aria-controls="site-nav">Menu</button>
      <nav id="site-nav" class="site-nav" aria-label="Primary">
        <ul>
          <li><a href="/#services">Services</a></li>
          <li><a href="/#industries">Industries</a></li>
          <li><a href="/#work">Work</a></li>
          <li><a href="/#about">About</a></li>
          <li><a class="btn btn-primary nav-cta" href="/#contact">Contact</a></li>
        </ul>
      </nav>
    </div>
  </header>

  <main id="main" tabindex="-1">
    <section class="not-found" aria-labelledby="not-found-title">
      <div class="container">
        <p class="eyebrow">404 <span aria-hidden="true">//</span> Signal lost</p>
        <h1 id="not-found-title">This page isn't on the network.</h1>
        <p><a class="btn btn-primary" href="/">Back to outcoretech.com</a></p>
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <div class="container footer-inner">
      <p>© 2026 Outcore Tech</p>
      <nav aria-label="Footer">
        <ul>
          <li><a href="/#services">Services</a></li>
          <li><a href="/#industries">Industries</a></li>
          <li><a href="/#work">Work</a></li>
          <li><a href="/#about">About</a></li>
          <li><a href="/#contact">Contact</a></li>
        </ul>
      </nav>
      <p class="footer-tag">AI · IoT · Automation · Optimization</p>
    </div>
  </footer>
</body>
</html>
```

- [ ] **Step 4: Add the 404 styles to `site/assets/css/site.css`**

First change the selector `.hero::before {` (from Task 4) to `.hero::before,
.not-found::before {`, so the 404 page reuses the grid texture. Then append:

```css

/* ---------- 404 (reuses the hero grid through .not-found::before) ---------- */
.not-found {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  min-height: calc(100vh - var(--header-h));
  min-height: calc(100dvh - var(--header-h));
  padding: 6rem 0;
  border-bottom: 1px solid var(--line);
}
.not-found .container { position: relative; }
.not-found h1 { max-width: 20ch; }
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx playwright test tests/not-found.spec.js`
Expected: all 4 tests pass.

- [ ] **Step 6: Run the static checks and commit**

Run: `npm run check`
Expected: every check passes. The link checker resolves `/assets/...` and `/#services` against `site/`.

```bash
git add site/404.html site/assets/css/site.css tests/not-found.spec.js
git commit -m "feat: add styled 404 page with root-absolute links" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01E9jrTVS6SFnYr1XeKBHVJs"
```

---

### Task 12: Layout and accessibility sweep, plus the deployed-URL tools

**Files:**
- Create: `tests/layout-a11y.spec.js`, `tools/smoke.mjs`, `tools/lighthouse.mjs`

**Interfaces:**
- Consumes: the whole page (Tasks 4–11), plus `fontsReady` and `fillForm` from `tests/helpers.js`.
- Produces:
  - The CLI `node tools/smoke.mjs <url> [--check-404]`. It exits 1 on any failed check and writes `screenshots/<host>-<width>-<scheme>.png`.
  - The CLI `node tools/lighthouse.mjs <url> [runs=3]`. It exits 1 if any category's median is below 0.95 and writes `lighthouse-<host>.json`.

- [ ] **Step 1: Write the sweep test `tests/layout-a11y.spec.js`**

```js
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { fontsReady, fillForm } from './helpers.js';

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const BACKGROUND = { light: 'rgb(243, 242, 238)', dark: 'rgb(14, 17, 21)' };
const overflowX = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const describeViolations = (violations) =>
  violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);

for (const colorScheme of ['light', 'dark']) {
  test.describe(`${colorScheme} scheme`, () => {
    test.use({ colorScheme });

    test('page background follows the scheme', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('body')).toHaveCSS('background-color', BACKGROUND[colorScheme]);
    });

    for (const width of [320, 375, 768, 1024, 1440]) {
      test(`no horizontal scroll at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto('/');
        await fontsReady(page);
        expect(await overflowX(page)).toBe(0);
        if (width === 375 || width === 1440) {
          await page.screenshot({ path: `screenshots/home-${width}-${colorScheme}.png`, fullPage: true });
        }
      });
    }

    for (const width of [375, 1280]) {
      test(`zero axe WCAG 2.2 A/AA violations at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto('/');
        await fontsReady(page);
        const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
        expect(describeViolations(violations)).toEqual([]);
      });
    }

    test('zero axe violations with the open mobile menu', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 900 });
      await page.goto('/');
      await page.locator('.nav-toggle').click();
      const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
      expect(describeViolations(violations)).toEqual([]);
    });

    test('zero axe violations with the form error and the no-JS confirmation showing', async ({ page }) => {
      await page.route('https://api.web3forms.com/submit', (route) => route.abort('failed'));
      await page.goto('/#message-sent');
      await fillForm(page);
      await page.getByRole('button', { name: 'Send message' }).click();
      await expect(page.locator('.form-error')).not.toBeEmpty();
      await expect(page.locator('#message-sent')).toBeVisible();
      const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
      expect(describeViolations(violations)).toEqual([]);
    });

    test('zero axe violations on the 404 page', async ({ page }) => {
      await page.goto('/missing/page');
      const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
      expect(describeViolations(violations)).toEqual([]);
    });
  });
}

test('every tab stop shows a visible focus ring at least 2px wide', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  const stops = await page.evaluate(
    () =>
      [...document.querySelectorAll('a[href], button, input, select, textarea')].filter(
        (el) => el.tabIndex >= 0 && !el.disabled && el.checkVisibility(),
      ).length,
  );
  const seen = [];
  for (let i = 0; i < stops; i += 1) {
    await page.keyboard.press('Tab');
    seen.push(
      await page.evaluate(() => {
        const el = document.activeElement;
        const s = getComputedStyle(el);
        return {
          // The document-order position keeps footer links distinct from header links of the same name.
          element: `${[...document.querySelectorAll('a[href], button, input, select, textarea')].indexOf(el)} ${el.tagName.toLowerCase()} ${(el.textContent || el.name || '').trim().slice(0, 30)}`,
          style: s.outlineStyle,
          width: parseFloat(s.outlineWidth),
        };
      }),
    );
  }
  expect(seen.filter((stop) => stop.style === 'none' || stop.width < 2)).toEqual([]);
  expect(stops).toBeGreaterThan(20);
  expect(new Set(seen.map((stop) => stop.element)).size).toBe(stops);
});

// Review Focus 4
test('deep links and strip links land below the sticky header', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1280, height: 800 });
  for (const hash of ['#services', '#work', '#about']) {
    await page.goto(`/${hash}`);
    const top = await page.locator(hash).evaluate((el) => el.getBoundingClientRect().top);
    expect(top, hash).toBeGreaterThanOrEqual(64);
  }
  await page.goto('/');
  await page.locator('.service-strip a[href="#ai"]').click();
  const cardTop = await page.locator('#ai').evaluate((el) => el.getBoundingClientRect().top);
  expect(cardTop).toBeGreaterThanOrEqual(64);
});

// Review Focus 5
test('a 125% default font size causes no horizontal scroll or clipped header at 375px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/');
  await page.addStyleTag({ content: 'html { font-size: 125%; }' });
  await fontsReady(page);
  expect(await overflowX(page)).toBe(0);
  const header = await page.locator('.site-header').boundingBox();
  const toggle = await page.locator('.nav-toggle').boundingBox();
  expect(toggle.x + toggle.width).toBeLessThanOrEqual(375);
  expect(toggle.y + toggle.height).toBeLessThanOrEqual(header.y + header.height);
});

test('no third-party requests on load, and both font families load', async ({ page, baseURL }) => {
  const urls = [];
  page.on('request', (request) => urls.push(request.url()));
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect(urls.filter((url) => !url.startsWith(`${baseURL}/`))).toEqual([]);
  await fontsReady(page);
  expect(
    await page.evaluate(() => [
      document.fonts.check('16px "IBM Plex Sans"'),
      document.fonts.check('500 13px "IBM Plex Mono"'),
    ]),
  ).toEqual([true, true]);
});
```

- [ ] **Step 2: Run the sweep**

Run: `npx playwright test tests/layout-a11y.spec.js`
Expected: all 26 tests pass: 2 schemes × (1 background + 5 widths + 2 axe + 3 state-specific axe) = 22, plus 4.

If a test fails, use superpowers:systematic-debugging. The failure message names the element (axe target selector, overflow width, or focus stop). Fix it in the file that owns that element per the File Map, not by weakening the test, then rerun the whole spec. Any token value change must keep `node tools/check-contrast.mjs` passing, and the new value goes into spec §4.1.

- [ ] **Step 3: Review the screenshots**

Open `screenshots/home-375-light.png`, `home-375-dark.png`, `home-1440-light.png`, and `home-1440-dark.png` with the Read tool. Check each against spec §4:
- graphite and amber in dark, warm paper and dark amber in light;
- mono labels are uppercase;
- the four service cards form one row at 1440 and one column at 375;
- the project cards form two columns at 1440;
- no text overlaps, and nothing is clipped at the right edge.

Fix any visual defect in `site.css` and rerun Step 2.

- [ ] **Step 4: Create `tools/smoke.mjs`**

```js
// Smoke-tests a deployed copy of the site: node tools/smoke.mjs <url> [--check-404]
// Loads the page in headless Chromium (light and dark), checks the essentials, saves screenshots/.
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const url = process.argv[2];
if (!url) {
  console.error('Usage: node tools/smoke.mjs <url> [--check-404]');
  process.exit(2);
}
const check404 = process.argv.includes('--check-404');
const host = new URL(url).host.replace(/[^a-z0-9.-]/gi, '_');
const HEADLINE = 'Engineering that connects the plant floor, the network, and the cloud.';
const BACKGROUND = { light: 'rgb(243, 242, 238)', dark: 'rgb(14, 17, 21)' };
const failures = [];
const check = (ok, label) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`);
  if (!ok) failures.push(label);
};

await mkdir('screenshots', { recursive: true });
const browser = await chromium.launch();
try {
  for (const colorScheme of ['light', 'dark']) {
    const context = await browser.newContext({ colorScheme });
    const page = await context.newPage();
    const bad = [];
    page.on('response', (r) => {
      if (r.status() >= 400) bad.push(`${r.status()} ${r.url()}`);
    });
    page.on('requestfailed', (r) => bad.push(`failed ${r.url()}`));

    const res = await page.goto(url, { waitUntil: 'networkidle' });
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    check(res.status() === 200, `[${colorScheme}] ${url} returns 200 (got ${res.status()})`);
    check((await page.locator('h1').textContent()).trim() === HEADLINE, `[${colorScheme}] headline present`);
    check(bad.length === 0, `[${colorScheme}] no failed requests${bad.length ? `: ${bad.join(', ')}` : ''}`);
    const bg = await page.locator('body').evaluate((b) => getComputedStyle(b).backgroundColor);
    check(bg === BACKGROUND[colorScheme], `[${colorScheme}] stylesheet applied (body ${bg})`);
    check(await page.evaluate(() => document.fonts.check('16px "IBM Plex Sans"')), `[${colorScheme}] IBM Plex Sans loaded`);
    for (const width of [375, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.screenshot({ path: `screenshots/${host}-${width}-${colorScheme}.png`, fullPage: true });
    }

    if (check404 && colorScheme === 'light') {
      const missing = await page.goto(new URL('/a/b/c', url).href);
      check(missing.status() === 404, `/a/b/c returns 404 (got ${missing.status()})`);
      const missingBg = await page.locator('body').evaluate((b) => getComputedStyle(b).backgroundColor);
      check(missingBg === BACKGROUND.light, `404 page is styled (body ${missingBg})`);
    }
    await context.close();
  }
} finally {
  await browser.close();
}
console.log(failures.length ? `${failures.length} smoke check(s) failed` : 'Smoke checks passed');
process.exitCode = failures.length ? 1 : 0;
```

- [ ] **Step 5: Create `tools/lighthouse.mjs`**

```js
// Runs Lighthouse (mobile, default throttling) N times; every category's median must be >= 0.95.
// Usage: node tools/lighthouse.mjs <url> [runs=3]
import { writeFile } from 'node:fs/promises';
import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';
import { chromium } from '@playwright/test';

const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'];
const url = process.argv[2];
const runs = Number(process.argv[3] ?? 3);
if (!url) {
  console.error('Usage: node tools/lighthouse.mjs <url> [runs=3]');
  process.exit(2);
}

const scores = Object.fromEntries(CATEGORIES.map((c) => [c, []]));
for (let i = 1; i <= runs; i += 1) {
  const chrome = await launch({ chromePath: chromium.executablePath(), chromeFlags: ['--headless=new'] });
  try {
    const result = await lighthouse(url, {
      port: chrome.port,
      output: 'json',
      onlyCategories: CATEGORIES,
      logLevel: 'error',
    });
    for (const c of CATEGORIES) scores[c].push(result.lhr.categories[c].score);
    console.log(`run ${i}: ${CATEGORIES.map((c) => `${c} ${Math.round(result.lhr.categories[c].score * 100)}`).join(', ')}`);
    if (i === runs) {
      await writeFile(`lighthouse-${new URL(url).host.replace(/[^a-z0-9.-]/gi, '_')}.json`, result.report);
    }
  } finally {
    await chrome.kill();
  }
}

const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
let failed = 0;
for (const c of CATEGORIES) {
  const m = median(scores[c]);
  if (m < 0.95) failed += 1;
  console.log(`${m >= 0.95 ? 'ok  ' : 'FAIL'} ${c}: median ${Math.round(m * 100)}`);
}
process.exitCode = failed ? 1 : 0;
```

- [ ] **Step 6: Run both tools against the local server**

Run, with the server in the background (it is stopped at the end of the step):
```bash
node tools/serve.mjs site &   # not "npm run serve": in Git Bash, kill would stop npm and orphan the node server
SERVE_PID=$!
sleep 2
node tools/smoke.mjs http://127.0.0.1:4173/ --check-404
node tools/lighthouse.mjs http://127.0.0.1:4173/ 1
kill $SERVE_PID
```
Expected: the smoke tool prints only `ok` lines and ends with `Smoke checks passed`. Lighthouse prints one run, with Accessibility, Best Practices, and SEO at 95 or above. Local Performance is only an early signal, because the local server sends `cache-control: no-store`. The binding run is against the production URL in Task 15. If Accessibility, Best Practices, or SEO is below 95, open `lighthouse-127.0.0.1_4173.json`, find the failing audits (`score < 1`), fix them, and rerun.

- [ ] **Step 7: Run the full suite**

Run: `npm test`
Expected: every static check passes and every Playwright test passes, 104 in total. Count them with `npx playwright test --list | tail -1`.

- [ ] **Step 8: Commit**

```bash
git add tests/layout-a11y.spec.js tools/smoke.mjs tools/lighthouse.mjs site/assets/css/site.css site/index.html
git commit -m "test: add layout/accessibility sweep and deployed-URL smoke and Lighthouse tools" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01E9jrTVS6SFnYr1XeKBHVJs"
```

---

### Task 13: CI workflow and README

**Files:**
- Create: `.github/workflows/pages.yml`, `README.md`

**Interfaces:**
- Consumes: the npm scripts `check`, `check:live`, and `test:e2e` (Task 1).
- Produces: a workflow that runs on push to `main` and on `workflow_dispatch`. The `validate` job must succeed before the `deploy` job publishes `site/`.

- [ ] **Step 1: Create `.github/workflows/pages.yml`**

```yaml
name: Validate and deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run check
      - run: npm run check:live
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
      - if: failure()
        uses: actions/upload-artifact@v7
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7

  deploy:
    needs: validate
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v7
      - uses: actions/configure-pages@v6
      - uses: actions/upload-pages-artifact@v5
        with:
          path: site
      - id: deployment
        uses: actions/deploy-pages@v5
```

- [ ] **Step 2: Validate the workflow file**

Run: `npx --yes @action-validator/cli@0.6.0 .github/workflows/pages.yml`
Expected: no output, exit 0.

- [ ] **Step 3: Create `README.md`**

````markdown
# outcoretech.com

Source for the Outcore Tech website. The deployed site is the `site/` folder: plain HTML, CSS, and one small JS file, with no build step.
The design spec is `docs/superpowers/specs/2026-09-28-outcore-tech-site-design.md`.

## Edit the site

- **Copy:** `site/index.html`. Tests in `tests/` pin the approved wording, so update the matching test when you change copy on purpose.
- **Styles:** `site/assets/css/site.css`. Colours come only from the tokens at the top; `npm run check` enforces their contrast.
- **Footer year:** `© 2026` in `site/index.html` and `site/404.html`.
- **Contact form:** submissions go through Web3Forms to contact@outcoretech.com. The key is the `access_key` hidden input in `site/index.html`, and it is public by design.

## Preview locally

```bash
npm install
npx playwright install chromium
npm run serve          # http://127.0.0.1:4173/
```

## Test

```bash
npm run check          # unit tests, HTML validation, contrast, links, form config
npm test               # all of the above plus the browser tests
```

## Deploy

Push to `main`. GitHub Actions validates, then publishes `site/` to GitHub Pages at https://outcoretech.com.
After launch there is no staging URL, so preview locally before pushing.

## Maintenance commands

```bash
npm run images                                      # regenerate og-image.png, apple-touch-icon.png, favicon.ico
node tools/smoke.mjs https://outcoretech.com/ --check-404
node tools/lighthouse.mjs https://outcoretech.com/  # median of 3 runs, each category must be >= 95
```
````

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/pages.yml README.md
git commit -m "ci: validate then deploy site/ to GitHub Pages; add README" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01E9jrTVS6SFnYr1XeKBHVJs"
```

---

### Task 14: Stage 1: publish the preview (spec §5.4 Stage 1, §6 Stage 1)

This task runs against GitHub, which makes it outward-facing: it creates a **public** repository and publishes a web page. Ari approved both in the spec (§1 and §5.4). Before Step 4, confirm in chat that Ari is ready for the repo to go public.

**Files:** none created. This task publishes what Tasks 1–13 built.

**Interfaces:**
- Consumes: the whole repo, and `gh` authenticated as `lz64` with the `repo` and `workflow` scopes.
- Produces: the public repo `https://github.com/lz64/outcoretech`, Pages with `build_type=workflow`, and the preview at `https://lz64.github.io/outcoretech/`.

- [ ] **Step 1: Pre-flight**

Run:
```bash
git add docs/superpowers
git diff --cached --quiet || git commit -m "docs: record plan progress and spec updates" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01E9jrTVS6SFnYr1XeKBHVJs"
npm test
npm run check:live
git status --short
git log --format=%ae | sort -u
gh auth status
gh api user --jq .login
```
Expected:
- the tests pass;
- `Form config OK`;
- `git status` prints nothing;
- the only email listed is `51067939+lz64@users.noreply.github.com`;
- `gh` reports `Logged in to github.com account lz64` with token scopes that include `repo` and `workflow`;
- `gh api user --jq .login` prints exactly `lz64`, which is the active account used by `gh repo create` and the credential helper. If it prints anything else, run `gh auth switch --user lz64` and re-check.

If any other email appears in the log, stop and ask Ari before rewriting history.

- [ ] **Step 2: Make git push as `lz64`**

Run: `gh auth setup-git`
Expected: no output. Git's credential helper for github.com is now `gh`.

- [ ] **Step 3: Confirm with Ari**

In chat, say: "About to create the public repo lz64/outcoretech and publish the preview. OK?" Wait for a yes.

- [ ] **Step 4: Create the repo (without pushing)**

Run:
```bash
gh repo create lz64/outcoretech --public --description "Outcore Tech website (outcoretech.com)" --homepage "https://outcoretech.com" --source . --remote origin
git remote -v
```
Expected: `✓ Created repository lz64/outcoretech on GitHub`, and then `origin https://github.com/lz64/outcoretech.git` listed for both fetch and push.

- [ ] **Step 5: Enable Pages with the Actions build type**

Run: `gh api -X POST repos/lz64/outcoretech/pages -f build_type=workflow --jq '{build_type, html_url}'`
Expected: `{"build_type":"workflow","html_url":"https://lz64.github.io/outcoretech/"}`.

If the call fails because the repository is empty (HTTP 404 or 422), carry on with Step 6, run this step's command after the push, and then run `gh workflow run pages.yml`.

- [ ] **Step 6: Push and watch the deploy**

Run:
```bash
git push -u origin main
sleep 5
RUN_ID=$(gh run list --workflow pages.yml --limit 1 --json databaseId --jq '.[0].databaseId')
gh run watch "$RUN_ID" --exit-status
```
Expected: the `validate` and `deploy` jobs both finish with ✓, and the command exits 0.

If `validate` fails, open the log with `gh run view "$RUN_ID" --log-failed`, fix the cause locally (with a test first if it's a code defect), commit, push, and watch again. Stage 1 is only complete when a run has succeeded **after** Pages was enabled.

- [ ] **Step 7: Smoke-test the preview**

Run:
```bash
gh api repos/lz64/outcoretech/pages --jq '{build_type, html_url, status}'
node tools/smoke.mjs https://lz64.github.io/outcoretech/
```
Expected: `build_type` is `workflow` and `status` is `built`. The smoke tool ends with `Smoke checks passed`. Don't pass `--check-404` here: on the preview sub-path the 404 page is unstyled by design (spec §3.10).

- [ ] **Step 8: Lighthouse early signal (not binding)**

Run: `node tools/lighthouse.mjs https://lz64.github.io/outcoretech/`
Expected: Performance, Accessibility, and Best Practices medians are at least 95. SEO may land below 95 on the preview only, because the canonical URL points at outcoretech.com, a different host. Record all four medians in the chat summary. Any Accessibility or Best Practices audit below 95 is fixed now, with a test, commit, and push.

- [ ] **Step 9: Hand the preview to Ari**

Send Ari the link `https://lz64.github.io/outcoretech/` and the four screenshots from `screenshots/lz64.github.io-{375,1440}-{light,dark}.png` (with SendUserFile). Then ask Ari to do these four things:
1. **Review every word** on the live preview. Any copy change is made in `site/index.html` together with its pinned test, then committed and pushed.
2. **Send one real test message with the form** (JavaScript on). Confirm three things in Zoho:
   - the "Thanks — your message is on its way…" message appeared on the page;
   - the email arrived at contact@outcoretech.com (check spam);
   - hitting **Reply** addresses the email typed into the form.
   If the page shows the failure message, Web3Forms may be rejecting `lz64.github.io`. In that case, run `npm run serve` and repeat the test from `http://127.0.0.1:4173/` (spec §7).
3. In the Web3Forms dashboard, set this form's **data retention to 30 days** (spec §5.3 item 6).
4. In Zoho Mail, add the Web3Forms sender address shown on the test email to the allow-list.

- [ ] **Step 10: Gate**

Stage 1 is done only when Ari has confirmed, in chat:
- the copy is approved;
- the test email arrived and Reply works;
- retention is set to 30 days.

Do not start Task 15 before then.

---

### Task 15: Stage 2: point outcoretech.com at the site (spec §5.4 Stage 2, §6 Stage 2)

This task changes live DNS for Ari's domain, where his mail also lives. Ari makes every GoDaddy change and the GitHub account verification himself. You run commands and verify.

**Files:**
- Create: `tools/dns.mjs`, `tools/dns.test.mjs`
- Modify: `site/index.html` (the form `redirect` value)

**Interfaces:**
- Produces:
  - From `tools/dns.mjs`: `snapshot(servers?): Promise<Record<string, string[]>>`, whose keys look like `'@ A'`, `'www CNAME'`, `'zmail._domainkey TXT'`; and `verifyCutover(before, after): string[]`.
  - The CLI `node tools/dns.mjs snapshot <file>` and `node tools/dns.mjs verify <before-file>`.

- [ ] **Step 1: Write the failing DNS test `tools/dns.test.mjs`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verifyCutover } from './dns.mjs';

const BEFORE = {
  '@ A': ['15.197.148.33', '3.33.130.190'],
  '@ AAAA': [],
  '@ MX': ['10 mx.zoho.com', '20 mx3.zoho.com', '50 mx2.zoho.com'],
  '@ TXT': ['v=spf1 include:dc-8e814c8572._spfm.outcoretech.com ~all'],
  '@ CAA': [],
  'www CNAME': ['outcoretech.com'],
  '_dmarc TXT': [],
  'zmail._domainkey TXT': ['v=DKIM1; k=rsa; p=MIGf'],
  'dc-8e814c8572._spfm TXT': ['v=spf1 include:zoho.com ~all'],
  '_github-pages-challenge-lz64 TXT': [],
  '_domainconnect CNAME': ['_domainconnect.gd.domaincontrol.com'],
};

const GOOD_AFTER = {
  ...BEFORE,
  '@ A': ['185.199.108.153', '185.199.109.153', '185.199.110.153', '185.199.111.153'],
  '@ AAAA': ['2606:50c0:8000::153', '2606:50c0:8001::153', '2606:50c0:8002::153', '2606:50c0:8003::153'],
  'www CNAME': ['lz64.github.io'],
  '_github-pages-challenge-lz64 TXT': ['0123456789abcdef'],
};

test('a correct cutover passes', () => {
  assert.deepEqual(verifyCutover(BEFORE, GOOD_AFTER), []);
});

test('AAAA records are optional', () => {
  assert.deepEqual(verifyCutover(BEFORE, { ...GOOD_AFTER, '@ AAAA': [] }), []);
});

test('a leftover parking A record fails', () => {
  const after = { ...GOOD_AFTER, '@ A': [...GOOD_AFTER['@ A'], '15.197.148.33'].sort() };
  assert.equal(verifyCutover(BEFORE, after).length, 1);
});

test('a changed MX record fails', () => {
  assert.equal(verifyCutover(BEFORE, { ...GOOD_AFTER, '@ MX': ['10 mx.zoho.com'] }).length, 1);
});

test('a deleted DKIM record fails', () => {
  assert.equal(verifyCutover(BEFORE, { ...GOOD_AFTER, 'zmail._domainkey TXT': [] }).length, 1);
});

test('a www record that does not point at lz64.github.io fails', () => {
  assert.equal(verifyCutover(BEFORE, { ...GOOD_AFTER, 'www CNAME': ['outcoretech.com'] }).length, 1);
});

test('a missing GitHub verification TXT record fails', () => {
  assert.equal(verifyCutover(BEFORE, { ...GOOD_AFTER, '_github-pages-challenge-lz64 TXT': [] }).length, 1);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test tools/dns.test.mjs`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `./dns.mjs`.

- [ ] **Step 3: Implement `tools/dns.mjs`**

```js
// DNS before/after checks for the outcoretech.com cutover (spec §5.4 Stage 2, §6 Stage 2).
// Only the web records may change; every mail record must be byte-identical afterwards.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { Resolver } from 'node:dns/promises';

export const DOMAIN = 'outcoretech.com';
export const QUERIES = [
  ['@', 'A'], ['@', 'AAAA'], ['@', 'MX'], ['@', 'TXT'], ['@', 'CAA'],
  ['www', 'CNAME'],
  ['_dmarc', 'TXT'], ['zmail._domainkey', 'TXT'], ['dc-8e814c8572._spfm', 'TXT'],
  ['_github-pages-challenge-lz64', 'TXT'], ['_domainconnect', 'CNAME'],
];
export const EXPECTED_AFTER = {
  '@ A': ['185.199.108.153', '185.199.109.153', '185.199.110.153', '185.199.111.153'],
  '@ AAAA': ['2606:50c0:8000::153', '2606:50c0:8001::153', '2606:50c0:8002::153', '2606:50c0:8003::153'],
  'www CNAME': ['lz64.github.io'],
};
const MAY_CHANGE = new Set(['@ A', '@ AAAA', 'www CNAME', '_github-pages-challenge-lz64 TXT']);

async function query(resolver, name, type) {
  try {
    switch (type) {
      case 'A': return (await resolver.resolve4(name)).sort();
      case 'AAAA': return (await resolver.resolve6(name)).sort();
      case 'MX': return (await resolver.resolveMx(name)).map((m) => `${m.priority} ${m.exchange}`).sort();
      case 'TXT': return (await resolver.resolveTxt(name)).map((chunks) => chunks.join('')).sort();
      case 'CAA': return (await resolver.resolveCaa(name)).map((c) => JSON.stringify(c)).sort();
      case 'CNAME': return (await resolver.resolveCname(name)).map((n) => n.toLowerCase()).sort();
      default: throw new Error(`unsupported type ${type}`);
    }
  } catch (error) {
    if (error.code === 'ENODATA' || error.code === 'ENOTFOUND') return [];
    throw error;
  }
}

export async function snapshot(servers = ['8.8.8.8', '1.1.1.1']) {
  const resolver = new Resolver();
  resolver.setServers(servers);
  const out = {};
  for (const [host, type] of QUERIES) {
    const name = host === '@' ? DOMAIN : `${host}.${DOMAIN}`;
    out[`${host} ${type}`] = await query(resolver, name, type);
  }
  return out;
}

const same = (a = [], b = []) => JSON.stringify(a) === JSON.stringify(b);

export function verifyCutover(before, after) {
  const problems = [];
  for (const key of Object.keys(before)) {
    if (MAY_CHANGE.has(key)) continue;
    if (!same(before[key], after[key])) {
      problems.push(`${key} changed: ${JSON.stringify(before[key])} -> ${JSON.stringify(after[key] ?? [])}`);
    }
  }
  for (const [key, want] of Object.entries(EXPECTED_AFTER)) {
    const got = after[key] ?? [];
    if (key === '@ AAAA' && got.length === 0) continue; // AAAA is recommended, not required
    if (!same([...want].sort(), got)) problems.push(`${key} is ${JSON.stringify(got)}, expected ${JSON.stringify(want)}`);
  }
  if ((after['_github-pages-challenge-lz64 TXT'] ?? []).length === 0) {
    problems.push('_github-pages-challenge-lz64 TXT is missing (it must stay permanently)');
  }
  return problems;
}

if (import.meta.main) {
  const [command, file] = process.argv.slice(2);
  if (command === 'snapshot' && file) {
    const snap = await snapshot();
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, `${JSON.stringify(snap, null, 2)}\n`);
    console.log(JSON.stringify(snap, null, 2));
    console.log(`Saved to ${file}`);
  } else if (command === 'verify' && file) {
    const problems = verifyCutover(JSON.parse(await readFile(file, 'utf8')), await snapshot());
    for (const problem of problems) console.log(`DNS ${problem}`);
    console.log(problems.length ? `${problems.length} DNS problem(s)` : 'Cutover DNS verified: web records correct, all other records unchanged');
    process.exitCode = problems.length ? 1 : 0;
  } else {
    console.error('Usage: node tools/dns.mjs snapshot <file> | verify <before-file>');
    process.exitCode = 2;
  }
}
```

- [ ] **Step 4: Run it to verify it passes, then commit**

Run: `node --test tools/dns.test.mjs`
Expected: `ℹ pass 7`, `ℹ fail 0`.

```bash
git add tools/dns.mjs tools/dns.test.mjs
git commit -m "chore: add DNS snapshot and cutover verification tool" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01E9jrTVS6SFnYr1XeKBHVJs"
git push
```

- [ ] **Step 5: Take the before-snapshot**

Run: `node tools/dns.mjs snapshot dns-snapshots/before.json`
Expected: JSON that shows `"@ A": ["15.197.148.33", "3.33.130.190"]`, the three Zoho MX records, the SPF TXT, and a non-empty `"zmail._domainkey TXT"`, followed by `Saved to dns-snapshots/before.json`.

Also ask Ari to export the zone file from GoDaddy (**Domain → DNS → ⋯ → Export zone file**) and keep it. It's the manual rollback copy.

- [ ] **Step 6: Ari verifies the domain on the GitHub account (web UI only; there is no API)**

Send Ari these steps:
1. Signed in to github.com as **lz64**, open **profile picture → Settings → Pages** (the account settings, not the repo settings). Under **Verified domains**, click **Add a domain**, enter `outcoretech.com`, and click **Add domain**. GitHub shows a TXT record value.
2. In GoDaddy, go to **DNS → Add New Record**. Set Type to `TXT` and Name to `_github-pages-challenge-lz64`. **Do not type `.outcoretech.com`; GoDaddy adds it.** Value is the value GitHub showed, and TTL stays at the default. Save.
3. Tell me when it's saved.

Then run this until it prints the value (it usually takes a few minutes):
```bash
nslookup -type=TXT _github-pages-challenge-lz64.outcoretech.com 8.8.8.8
```

Once it resolves, ask Ari to click **Verify** on the GitHub page and confirm it reads **Verified**. The TXT record stays in place permanently.

- [ ] **Step 7: Set the custom domain, then have Ari change DNS straight away**

Run: `gh api -X PUT repos/lz64/outcoretech/pages -f cname=outcoretech.com`
Expected: no output (HTTP 204). From this moment `lz64.github.io/outcoretech/` redirects to outcoretech.com, which is still parked, so Ari makes the DNS changes now.

Send Ari this list for GoDaddy **DNS** (and **Forwarding**):

| Action | Type | Name | Value | TTL |
|---|---|---|---|---|
| Remove any domain forwarding (under **Forwarding**) | — | — | — | — |
| Delete | A | @ | 15.197.148.33 | — |
| Delete | A | @ | 3.33.130.190 | — |
| Add | A | @ | 185.199.108.153 | 1 hour |
| Add | A | @ | 185.199.109.153 | 1 hour |
| Add | A | @ | 185.199.110.153 | 1 hour |
| Add | A | @ | 185.199.111.153 | 1 hour |
| Add (recommended) | AAAA | @ | 2606:50c0:8000::153 | 1 hour |
| Add (recommended) | AAAA | @ | 2606:50c0:8001::153 | 1 hour |
| Add (recommended) | AAAA | @ | 2606:50c0:8002::153 | 1 hour |
| Add (recommended) | AAAA | @ | 2606:50c0:8003::153 | 1 hour |
| Edit | CNAME | www | lz64.github.io | 1 hour |

**Do not touch:**
- the MX records (`mx.zoho.com`, `mx2.zoho.com`, `mx3.zoho.com`);
- any TXT record other than the new GitHub one, meaning the SPF records and `zmail._domainkey`;
- `_dmarc`;
- `_domainconnect`.

- [ ] **Step 8: Verify DNS**

Run, repeating every few minutes until it passes (propagation usually takes minutes; the outer bound is 24 h):
```bash
node tools/dns.mjs verify dns-snapshots/before.json
```
Expected: `Cutover DNS verified: web records correct, all other records unchanged`.

Any `changed:` line for a mail record means Ari must restore that record from the exported zone file at once. Stop and report it.

- [ ] **Step 9: Wait for the HTTPS certificate**

Run this as a background command (it stops by itself):
```bash
until [ "$(gh api repos/lz64/outcoretech/pages --jq '.https_certificate.state // ""')" = "approved" ]; do sleep 60; done; gh api repos/lz64/outcoretech/pages --jq '{cname, protected_domain_state, cert: .https_certificate.state, domains: .https_certificate.domains}'
```
Expected (usually within an hour of DNS resolving): `cname` is `outcoretech.com`, `protected_domain_state` is `verified`, `cert` is `approved`, and `domains` includes `outcoretech.com` and `www.outcoretech.com`.

If it isn't `approved` about 1 hour after Step 8 passed, re-trigger it:
```bash
gh api -X PUT repos/lz64/outcoretech/pages -F cname=null
gh api -X PUT repos/lz64/outcoretech/pages -f cname=outcoretech.com
```
Then keep polling.

- [ ] **Step 10: Enforce HTTPS**

Run: `gh api -X PUT repos/lz64/outcoretech/pages -F https_enforced=true && gh api repos/lz64/outcoretech/pages --jq '.https_enforced'`
Expected: `true`.

- [ ] **Step 11: Switch the form redirect to the production domain**

In `site/index.html`, change:
```html
            <input type="hidden" name="redirect" value="https://lz64.github.io/outcoretech/#message-sent">
```
to:
```html
            <input type="hidden" name="redirect" value="https://outcoretech.com/#message-sent">
```

Run:
```bash
npm run check && npx playwright test tests/form-markup.spec.js tests/form-nojs.spec.js
git add site/index.html
git commit -m "feat: point the no-JS form redirect at outcoretech.com" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01E9jrTVS6SFnYr1XeKBHVJs"
git push
sleep 5
gh run watch "$(gh run list --workflow pages.yml --limit 1 --json databaseId --jq '.[0].databaseId')" --exit-status
```
Expected: every check and test passes, and the run succeeds.

- [ ] **Step 12: Verify production**

Run:
```bash
curl -sI http://outcoretech.com/ | grep -iE '^(HTTP|location)'
curl -sI https://www.outcoretech.com/ | grep -iE '^(HTTP|location)'
curl -sI https://lz64.github.io/outcoretech/ | grep -iE '^(HTTP|location)'
curl -s -o /dev/null -w '%{http_code}\n' https://outcoretech.com/
node tools/smoke.mjs https://outcoretech.com/ --check-404
node tools/lighthouse.mjs https://outcoretech.com/
node tools/dns.mjs verify dns-snapshots/before.json
```
Expected:
- The three `curl -sI` calls each show a `301` with `location: https://outcoretech.com/`.
- The status code is `200`.
- The smoke tool ends with `Smoke checks passed`, which includes the styled 404 at `/a/b/c`.
- Lighthouse prints `ok` for all four categories (medians ≥ 95). **This is the binding run** (success criterion 4).
- `Cutover DNS verified…`.

If a Lighthouse category fails, open `lighthouse-outcoretech.com.json`, fix the failing audits with a test, commit, push, and rerun.

- [ ] **Step 13: Ari's final checks**

Ask Ari to do three things:
1. **Test the form with JavaScript off.** In Chrome, open `https://outcoretech.com`, click the icon left of the address, choose **Site settings → JavaScript → Don't allow**, and reload. Fill in the form and send it. The page should return to `https://outcoretech.com/#message-sent` showing "Thanks — your message is on its way…". Confirm the email arrived in Zoho and that Reply goes to the address used. Then set JavaScript back to **Allow**.
2. **Check the link preview.** Paste `https://outcoretech.com/` into https://www.linkedin.com/post-inspector/ and confirm the image, title, and description.
3. **Check mail still works.** Send an email to contact@outcoretech.com from another account and confirm it arrives.

- [ ] **Step 14: Close out**

When Ari confirms all three, report the outcome in chat. Cover:
- the live URL;
- the Lighthouse medians;
- the DNS verification result;
- the two form tests (JS and no-JS);
- the mail check.

Stage 2 and the spec's success criteria 1–6 are then met.

---

## Self-Review Notes

- **Spec coverage:**
  - §3.1 → Tasks 4 and 10; §3.2 → Tasks 4, 5, and 6; §3.3–3.5 → Task 6; §3.6–3.7 → Task 7; §3.8 → Tasks 8 and 9; §3.9 → Task 4; §3.10 → Task 11; §3.11 → Task 4.
  - §4.1 → Task 2 (contract) and Task 12 (axe); §4.2 → Tasks 2 and 4; §4.3 → Tasks 2–6; §4.4 → Tasks 2, 6, 7, and 12; §4.5 → Tasks 4, 5, 8, and 12.
  - §5.1–5.2 → the File Map; §5.3 → Tasks 8 and 9, plus Task 14 Step 9 (retention); §5.4 → Tasks 13–15.
  - §6 → Task 12 and Tasks 14–15; §7 → Tasks 14–15 (owner actions).
- **Consistency:** the ids, classes, and helper names used by later tasks are all listed in each producing task's Interfaces block. `site.js` is written in full twice: Task 9 has the form only, and Task 10 replaces it with nav plus form. The form code is identical in both.
- **Review Focus:** items 1–3 are pinned in `tests/form-js.spec.js` (Task 9), and items 4–5 in `tests/layout-a11y.spec.js` (Task 12).
