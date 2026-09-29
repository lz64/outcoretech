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
