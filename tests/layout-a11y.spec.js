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

    // The sweep above runs in the default "loop" state; this covers the "paused" state (Play motion button).
    test('zero axe violations with motion paused', async ({ page }) => {
      for (const path of ['/', '/missing/page']) {
        await page.goto(path);
        await fontsReady(page);
        if (path === '/') await page.getByRole('button', { name: 'Pause motion', exact: true }).click();
        await expect(page.locator('html')).toHaveAttribute('data-motion', 'paused');
        await expect(page.getByRole('button', { name: 'Play motion', exact: true })).toBeVisible();
        const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
        expect(describeViolations(violations), path).toEqual([]);
      }
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
  for (const hash of ['#services', '#work', '#about', '#contact']) {
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

// Finding F2: the nav breakpoint is em-based so it moves with the visitor's default text size.
test('a 20px browser default font size at 768px shows the mobile nav toggle with no overflow', async ({ page }) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Page.setFontSizes', { fontSizes: { standard: 20 } });
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto('/');
  await fontsReady(page);
  expect(await overflowX(page)).toBe(0);
  await expect(page.locator('.nav-toggle')).toBeVisible();
});

test.describe('no-JS fallback with a 20px browser default font size', () => {
  test.use({ javaScriptEnabled: false });

  test('shows all 5 primary nav links at 768px with no horizontal overflow', async ({ page }) => {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Page.setFontSizes', { fontSizes: { standard: 20 } });
    await page.setViewportSize({ width: 768, height: 900 });
    await page.goto('/');
    expect(await overflowX(page)).toBe(0);
    for (const name of ['Services', 'Industries', 'Work', 'About', 'Contact']) {
      await expect(page.locator('#site-nav').getByRole('link', { name, exact: true })).toBeVisible();
    }
  });
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
