import { test, expect } from '@playwright/test';
import { fontsReady } from './helpers.js';

// Spec §3.2: the amber pulse loops (3.2 s cycle) when site.js runs and the pause control is on the page;
// without JS it plays twice (4.9 s) and stops; under reduced motion it never moves.
const pulseTiming = (page) =>
  page.locator('.sch-pulse').evaluate((el) => {
    const s = getComputedStyle(el);
    return {
      name: s.animationName,
      duration: s.animationDuration,
      delay: s.animationDelay,
      count: s.animationIterationCount,
    };
  });

test('schematic is decorative and labels the four stages in order', async ({ page }) => {
  await page.goto('/');
  const svg = page.locator('.hero svg.schematic');
  await expect(svg).toHaveAttribute('aria-hidden', 'true');
  await expect(svg.locator('.sch-label')).toHaveText(['SENSOR', 'CONTROLLER', 'EDGE', 'CLOUD']);
});

test.describe('without JS (no pause control, so the motion must stop by itself)', () => {
  test.use({ javaScriptEnabled: false });

  test('pulse runs at most 5 seconds in total (WCAG 2.2.2)', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    expect(await page.locator('html').getAttribute('data-motion')).toBeNull();
    const timing = await pulseTiming(page);
    expect(timing.name).toBe('sch-pulse');
    expect(timing.count).not.toBe('infinite');
    const total = parseFloat(timing.delay) + parseFloat(timing.duration) * Number(timing.count);
    expect(total).toBeLessThanOrEqual(5);
    expect(total).toBeCloseTo(4.9, 5);
  });
});

test('with JS the pulse loops and the pause control is on the page', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'loop');
  expect(await pulseTiming(page)).toEqual({ name: 'sch-pulse-loop', duration: '3.2s', delay: '0.1s', count: 'infinite' });
  await expect(page.getByRole('button', { name: 'Pause motion', exact: true })).toBeVisible();
});

test('the looping pulse is off the path at both ends of its cycle and on it in between', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'loop');
  // currentTime includes the 100 ms delay; one cycle is 3200 ms. The samples: the start, mid-crossing, the end of
  // the crossing, 1 ms either side of the loop point, and mid-crossing in the second cycle.
  const offsets = await page.locator('.sch-pulse').evaluate((el) => {
    const [animation] = el.getAnimations();
    animation.pause();
    return [100, 100 + 1200, 100 + 2400, 100 + 3199, 100 + 3201, 100 + 3200 + 1200].map((time) => {
      animation.currentTime = time;
      return parseFloat(getComputedStyle(el).strokeDashoffset);
    });
  });
  // pathLength is 100 and the dash is 6 long: it is on the path only while -100 <= offset < 6
  // (0.01 of slack for the first millisecond of the next crossing).
  const visible = (offset) => offset >= -100 && offset < 5.99;
  expect(offsets.map(visible)).toEqual([false, true, false, false, false, true]);
  expect(offsets[0]).toBe(6);
  expect(offsets[1]).toBeCloseTo(-47.5, 0); // halfway along the route
  expect(offsets[2]).toBe(-101);
  expect(offsets[3]).toBe(-101);
  expect(offsets[4]).toBeCloseTo(6, 2);
});

// The number of pixels that differ visibly between two PNG screenshots of the same size.
const pixelDiff = (page, a, b) =>
  page.evaluate(async (sources) => {
    const pixels = async (src) => {
      const image = new Image();
      image.src = src;
      await image.decode();
      const canvas = new OffscreenCanvas(image.width, image.height);
      const context = canvas.getContext('2d');
      context.drawImage(image, 0, 0);
      return context.getImageData(0, 0, image.width, image.height).data;
    };
    const [p, q] = await Promise.all(sources.map(pixels));
    if (p.length !== q.length) return -1;
    let count = 0;
    for (let i = 0; i < p.length; i += 4) {
      if (Math.max(Math.abs(p[i] - q[i]), Math.abs(p[i + 1] - q[i + 1]), Math.abs(p[i + 2] - q[i + 2])) > 16) count += 1;
    }
    return count;
  }, [a, b].map((png) => `data:image/png;base64,${png.toString('base64')}`));

test('between passes, and when paused, the pulse paints nothing on the schematic', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await fontsReady(page);
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'loop');
  const schematic = page.locator('.schematic');
  const seek = (time) =>
    page.locator('.sch-pulse').evaluate((el, t) => {
      const [animation] = el.getAnimations();
      animation.pause();
      animation.currentTime = t;
    }, time);

  // Reference: the schematic with the pulse path not rendered at all.
  await seek(100);
  await schematic.screenshot(); // warm-up, so every later shot comes from a settled page
  const hide = await page.addStyleTag({ content: '.sch-pulse { visibility: hidden; }' });
  const reference = await schematic.screenshot();
  await hide.evaluate((style) => style.remove());

  await seek(100 + 1200);
  expect(await pixelDiff(page, await schematic.screenshot(), reference), 'mid-crossing the dash is drawn').toBeGreaterThan(20);
  // The start of a cycle, the end of the crossing, the middle of the rest, and just before the loop point.
  for (const time of [100, 100 + 2400, 100 + 2800, 100 + 3199]) {
    await seek(time);
    expect(await pixelDiff(page, await schematic.screenshot(), reference), `at ${time} ms`).toBe(0);
  }

  await page.getByRole('button', { name: 'Pause motion', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'paused');
  await page.mouse.move(640, 700);
  expect(await pixelDiff(page, await schematic.screenshot(), reference), 'paused').toBe(0);
});

test('pulse does not run under reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'loop');
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
