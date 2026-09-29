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
