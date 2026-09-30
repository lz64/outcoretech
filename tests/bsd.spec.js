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

test('the Hebrew font is not preloaded and is only fetched for Hebrew text', async ({ page }) => {
  const fonts = [];
  page.on('request', (r) => { if (r.resourceType() === 'font') fonts.push(new URL(r.url()).pathname); });
  await page.goto('/');
  await fontsReady(page);
  await expect(page.locator('link[rel="preload"][href*="hebrew"]')).toHaveCount(0);
  expect(fonts).toContain('/assets/fonts/ibm-plex-sans-hebrew-400.woff2');
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
