import { test, expect } from '@playwright/test';

// Spec §4.3 / §4.5: the "Pure Scope" logo mark. Decorative, plays once on load (3.65 s),
// replays on hover or keyboard focus of the brand link, and never moves under reduced motion.
const TRACE = 'M3.25 18H9.5L15.5 25.25L25.5 8.75';
const INK = { light: 'rgb(18, 22, 27)', dark: 'rgb(231, 234, 238)' };
const NODE = { light: 'rgb(245, 163, 15)', dark: 'rgb(255, 176, 32)' };
const MARK = '.site-header .brand .mark';

const runningAnimations = (page) =>
  page.locator(MARK).evaluate((svg) => svg.getAnimations({ subtree: true }).filter((a) => a.playState === 'running').length);

// Waits until the load run is over: at least 3.65 s of document time and nothing left running.
const waitForRest = (page) =>
  page.waitForFunction(
    (sel) => document.timeline.currentTime > 3700 && document.querySelector(sel).getAnimations({ subtree: true }).length === 0,
    MARK,
    { timeout: 8000 },
  );

// Every CSS animation on the mark and its descendants, read from computed styles (in ms).
const animationTimings = (page) =>
  page.locator(MARK).evaluate((svg) => {
    const ms = (v) => (v.endsWith('ms') ? Number.parseFloat(v) : Number.parseFloat(v) * 1000);
    const out = [];
    for (const el of [svg, ...svg.querySelectorAll('*')]) {
      const cs = getComputedStyle(el);
      const names = cs.animationName.split(',').map((s) => s.trim());
      if (names[0] === 'none') continue;
      const pick = (list, i) => { const parts = list.split(',').map((s) => s.trim()); return parts[i % parts.length]; };
      names.forEach((name, i) => {
        out.push({
          el: el.getAttribute('class'),
          name,
          delay: ms(pick(cs.animationDelay, i)),
          duration: ms(pick(cs.animationDuration, i)),
          iterations: pick(cs.animationIterationCount, i),
        });
      });
    }
    return out;
  });

test('the header mark is decorative and draws the scope trace ending in the node', async ({ page }) => {
  await page.goto('/');
  const mark = page.locator(MARK);
  await expect(mark).toHaveCount(1);
  await expect(mark).toHaveAttribute('aria-hidden', 'true');
  await expect(mark).toHaveAttribute('focusable', 'false');
  await expect(mark.locator('path.mark-trace')).toHaveAttribute('d', TRACE);
  const node = mark.locator('circle.mark-node');
  await expect(node).toHaveAttribute('cx', '25.5');
  await expect(node).toHaveAttribute('cy', '8.75');
  await expect(node).toHaveAttribute('r', '3.5');
  // One mark per page: none in the footer.
  await expect(page.locator('.site-footer .mark, .site-footer svg')).toHaveCount(0);
});

test('every mark animation ends within 5 s and none loops forever (WCAG 2.2.2)', async ({ page }) => {
  await page.goto('/');
  const check = (timings) => {
    expect(timings.length).toBeGreaterThanOrEqual(6);
    for (const t of timings) {
      expect(t.iterations, `${t.el} ${t.name}`).not.toBe('infinite');
      expect(t.delay + t.duration * Number(t.iterations), `${t.el} ${t.name}`).toBeLessThanOrEqual(5000);
    }
  };
  check(await animationTimings(page));
  // The load run plays once, 0.25 s delay + 3.4 s.
  const trace = (await animationTimings(page)).find((t) => t.el === 'mark-trace');
  expect(trace).toEqual({ el: 'mark-trace', name: 'mark-trace', delay: 250, duration: 3400, iterations: '1' });
  // The hover replay adds one more run of the same length.
  await page.locator('.site-header .brand').hover();
  check(await animationTimings(page));
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the mark has no animations, even on hover', async ({ page }) => {
    await page.goto('/');
    await expect.poll(() => page.locator(MARK).evaluate((svg) => svg.getAnimations({ subtree: true }).length)).toBe(0);
    await page.locator('.site-header .brand').hover();
    expect(await page.locator(MARK).evaluate((svg) => svg.getAnimations({ subtree: true }).length)).toBe(0);
  });
});

for (const colorScheme of ['light', 'dark']) {
  test.describe(`${colorScheme} scheme`, () => {
    test.use({ colorScheme });

    test('at rest the mark is the ink trace plus the amber node', async ({ page }) => {
      test.slow();
      await page.goto('/');
      expect(await runningAnimations(page)).toBeGreaterThan(0);
      await waitForRest(page);
      const mark = page.locator(MARK);
      for (const layer of ['.mark-lit', '.mark-bloom', '.mark-flare', '.mark-beam']) {
        await expect(mark.locator(layer), layer).toHaveCSS('opacity', '0');
      }
      await expect(mark.locator('.mark-trace')).toHaveCSS('stroke', INK[colorScheme]);
      await expect(mark.locator('.mark-trace')).toHaveCSS('opacity', '1');
      await expect(mark.locator('.mark-node')).toHaveCSS('fill', NODE[colorScheme]);
      const token = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--signal-node').trim());
      const hex = (rgb) => `#${rgb.match(/\d+/g).map((n) => Number(n).toString(16).padStart(2, '0')).join('')}`;
      expect(hex(NODE[colorScheme])).toBe(token.toLowerCase());
    });
  });
}

test('hovering the brand after the load run replays the animation', async ({ page }) => {
  test.slow();
  await page.goto('/');
  await waitForRest(page);
  expect(await runningAnimations(page)).toBe(0);
  await page.locator('.site-header .brand').hover();
  await expect.poll(() => runningAnimations(page)).toBeGreaterThanOrEqual(6);
});

test('keyboard focus on the brand replays the animation', async ({ page }) => {
  test.slow();
  await page.goto('/');
  await waitForRest(page);
  await page.keyboard.press('Tab'); // skip link
  await page.keyboard.press('Tab'); // brand
  await expect(page.locator('.site-header .brand')).toBeFocused();
  await expect.poll(() => runningAnimations(page)).toBeGreaterThanOrEqual(6);
});

test('the 404 page shows the same mark', async ({ page }) => {
  await page.goto('/');
  const home = await page.locator(MARK).evaluate((el) => el.outerHTML);
  const response = await page.goto('/missing/x');
  expect(response.status()).toBe(404);
  await expect(page.locator(MARK)).toHaveCount(1);
  expect(await page.locator(MARK).evaluate((el) => el.outerHTML)).toBe(home);
  await expect(page.locator(`${MARK} path.mark-trace`)).toHaveAttribute('d', TRACE);
});
