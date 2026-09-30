import { test, expect } from '@playwright/test';
import { fontsReady } from './helpers.js';

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

test('the 404 block fits the first viewport below the בס״ד line and the header', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/a/b/c');
  await fontsReady(page);
  const { bottom, innerHeight, scrollY } = await page.locator('.not-found').evaluate((el) => ({
    bottom: el.getBoundingClientRect().bottom,
    innerHeight: window.innerHeight,
    scrollY: window.scrollY,
  }));
  expect(scrollY).toBe(0);
  expect(bottom).toBeLessThanOrEqual(innerHeight + 1);
});
