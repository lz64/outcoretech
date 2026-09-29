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
