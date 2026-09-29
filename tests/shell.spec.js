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
