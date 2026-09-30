import { test, expect } from '@playwright/test';
import { fontsReady } from './helpers.js';

// Spec §3.1 / §3.12: בס״ד at the top right of every page, above the header.
// The letters are bet, samekh, gershayim (U+05F4, not a quote mark), dalet.
const BSD = 'בס״ד';

for (const path of ['/', '/missing/x']) {
  test.describe(`${path}`, () => {
    test('shows בס״ד as a Hebrew, right-to-left line', async ({ page }) => {
      await page.goto(path);
      const bsd = page.locator('.bsd');
      await expect(bsd).toHaveCount(1);
      expect(await bsd.evaluate((el) => el.textContent)).toBe(BSD);
      await expect(bsd).toHaveAttribute('lang', 'he');
      await expect(bsd).toHaveAttribute('dir', 'rtl');
      // It sits in its own bar immediately before the header.
      expect(await page.locator('.bsd-bar').evaluate((el) => el.nextElementSibling.matches('header.site-header'))).toBe(true);
    });

    test('sits above the header', async ({ page }) => {
      await page.goto(path);
      const bsd = await page.locator('.bsd').boundingBox();
      const header = await page.locator('.site-header').boundingBox();
      expect(bsd.y + bsd.height).toBeLessThanOrEqual(header.y);
    });

    for (const width of [375, 1440]) {
      test(`is at the top right at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 });
        await page.goto(path);
        await fontsReady(page);
        const bsd = await page.locator('.bsd').boundingBox();
        expect(bsd.y).toBeLessThan(40);
        expect(width - (bsd.x + bsd.width)).toBeLessThanOrEqual(40);
        expect(width - (bsd.x + bsd.width)).toBeGreaterThanOrEqual(0);
      });
    }

    test('renders in IBM Plex Sans Hebrew', async ({ page }) => {
      await page.goto(path);
      await fontsReady(page);
      await expect(page.locator('.bsd')).toHaveCSS('font-family', /^"IBM Plex Sans Hebrew"/);
      expect(await page.evaluate((text) => document.fonts.check('14px "IBM Plex Sans Hebrew"', text), BSD)).toBe(true);
    });

    test('causes no horizontal overflow at 320px', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 800 });
      await page.goto(path);
      await fontsReady(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    });
  });
}

test('the Hebrew font is not preloaded and is fetched for the בס״ד line (its unicode-range covers Hebrew)', async ({ page }) => {
  const fonts = [];
  page.on('request', (r) => { if (r.resourceType() === 'font') fonts.push(new URL(r.url()).pathname); });
  await page.goto('/');
  await fontsReady(page);
  await expect(page.locator('link[rel="preload"][href*="hebrew"]')).toHaveCount(0);
  expect(fonts).toContain('/assets/fonts/ibm-plex-sans-hebrew-400.woff2');

  // The @font-face is scoped by unicode-range, so the browser fetches it only for Hebrew text.
  const unicodeRanges = await page.evaluate(() =>
    [...document.styleSheets]
      .flatMap((sheet) => [...sheet.cssRules])
      .filter((rule) => rule instanceof CSSFontFaceRule)
      .filter((rule) => rule.style.getPropertyValue('font-family').replace(/["']/g, '').trim() === 'IBM Plex Sans Hebrew')
      .map((rule) => rule.style.getPropertyValue('unicode-range')));
  expect(unicodeRanges).toHaveLength(1);
  const ranges = unicodeRanges[0].split(',').map((part) => {
    const [lo, hi = lo] = part.trim().replace(/^u\+/i, '').split('-');
    return [Number.parseInt(lo.replace(/\?/g, '0'), 16), Number.parseInt(hi.replace(/\?/g, 'f'), 16)];
  });
  for (const [lo, hi] of [[0x0590, 0x05ff], [0xfb1d, 0xfb4f]]) {
    const hex = (n) => n.toString(16).toUpperCase().padStart(4, '0');
    expect(ranges.some(([a, b]) => a <= lo && b >= hi), `unicode-range "${unicodeRanges[0]}" covers U+${hex(lo)}-${hex(hi)}`).toBe(true);
  }
});

test('the bar scrolls away and the header still sticks to the top', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  const before = await page.locator('.site-header').boundingBox();
  expect(before.y).toBeGreaterThan(0);
  await page.evaluate(() => window.scrollTo(0, 1200));
  await expect.poll(async () => (await page.locator('.site-header').boundingBox()).y).toBe(0);
  expect((await page.locator('.bsd').boundingBox()).y).toBeLessThan(0);
});
