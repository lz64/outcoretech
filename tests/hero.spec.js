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
