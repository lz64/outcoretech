import { test, expect } from '@playwright/test';

// Spec §4.3 / §4.5: the "Pure Scope" logo mark. Decorative. With site.js it loops (6.5 s cycle: the 3.4 s scan,
// a rest at the static mark, a short ease back to the start state) and the top bar's "Pause motion" button
// stops it. Without JS it plays once on load (3.65 s) and replays on hover or keyboard focus of the brand link.
// It never moves under reduced motion.
const TRACE = 'M3.25 18H9.5L15.5 25.25L25.5 8.75';
const INK = { light: 'rgb(18, 22, 27)', dark: 'rgb(231, 234, 238)' };
const NODE = { light: 'rgb(245, 163, 15)', dark: 'rgb(255, 176, 32)' };
const NODE_OFF = { light: 'rgb(251, 214, 147)', dark: 'rgb(103, 79, 32)' };
const MARK = '.site-header .brand .mark';
const LAYERS = ['trace', 'bloom', 'lit', 'flare', 'node', 'beam'];
const EFFECT_LAYERS = ['.mark-lit', '.mark-bloom', '.mark-flare', '.mark-beam'];
const DELAY = 250;
const SCAN = 3400;
const CYCLE = 6500;

const runningAnimations = (page) =>
  page.locator(MARK).evaluate((svg) => svg.getAnimations({ subtree: true }).filter((a) => a.playState === 'running').length);

// Waits until the load run is over: at least 3.65 s of document time and nothing left running.
// (Polled from the test, so it also works with JavaScript disabled in the page.)
const waitForRest = (page) =>
  expect
    .poll(
      () => page.locator(MARK).evaluate((svg) => document.timeline.currentTime > 3700 && svg.getAnimations({ subtree: true }).length === 0),
      { timeout: 8000 },
    )
    .toBe(true);

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

// Freezes every animation on the mark at one point of its timeline (ms, counted from the start of the
// 250 ms delay) and reads the styles that define the mark's look.
const markAt = (page, time) =>
  page.locator(MARK).evaluate((svg, t) => {
    for (const animation of svg.getAnimations({ subtree: true })) {
      animation.pause();
      animation.currentTime = t;
    }
    const style = (selector) => getComputedStyle(svg.querySelector(selector));
    return {
      traceOpacity: Number(style('.mark-trace').opacity),
      traceStroke: style('.mark-trace').stroke,
      nodeFill: style('.mark-node').fill,
      effects: ['.mark-lit', '.mark-bloom', '.mark-flare', '.mark-beam'].map((selector) => Number(style(selector).opacity)),
    };
  }, time);

const channels = (rgb) => rgb.match(/[\d.]+/g).slice(0, 3).map(Number);
const colourDistance = (a, b) => Math.max(...channels(a).map((value, i) => Math.abs(value - channels(b)[i])));

const expectRestState = async (page, colorScheme) => {
  const mark = page.locator(MARK);
  for (const layer of EFFECT_LAYERS) {
    await expect(mark.locator(layer), layer).toHaveCSS('opacity', '0');
  }
  await expect(mark.locator('.mark-trace')).toHaveCSS('stroke', INK[colorScheme]);
  await expect(mark.locator('.mark-trace')).toHaveCSS('opacity', '1');
  await expect(mark.locator('.mark-node')).toHaveCSS('fill', NODE[colorScheme]);
  const token = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--signal-node').trim());
  const hex = (rgb) => `#${rgb.match(/\d+/g).map((n) => Number(n).toString(16).padStart(2, '0')).join('')}`;
  expect(hex(NODE[colorScheme])).toBe(token.toLowerCase());
};

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

// Without site.js there is no pause control, so the motion must be finite (WCAG 2.2.2).
test.describe('without JS (finite motion)', () => {
  test.use({ javaScriptEnabled: false });

  test('every mark animation ends within 5 s and none loops forever (WCAG 2.2.2)', async ({ page }) => {
    await page.goto('/');
    expect(await page.locator('html').getAttribute('data-motion')).toBeNull();
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
    expect(trace).toEqual({ el: 'mark-trace', name: 'mark-trace', delay: DELAY, duration: SCAN, iterations: '1' });
    // The hover replay adds one more run of the same length.
    await page.locator('.site-header .brand').hover();
    const hovered = await animationTimings(page);
    expect(hovered).toHaveLength(12);
    check(hovered);
  });

  for (const colorScheme of ['light', 'dark']) {
    test.describe(`${colorScheme} scheme`, () => {
      test.use({ colorScheme });

      test('at rest the mark is the ink trace plus the amber node', async ({ page }) => {
        test.slow();
        await page.goto('/');
        expect(await runningAnimations(page)).toBeGreaterThan(0);
        await waitForRest(page);
        await expectRestState(page, colorScheme);
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
    await page.keyboard.press('Tab'); // brand (the motion button is hidden without JS)
    await expect(page.locator('.site-header .brand')).toBeFocused();
    await expect.poll(() => runningAnimations(page)).toBeGreaterThanOrEqual(6);
  });
});

test.describe('with JS (looping motion)', () => {
  const loopTimings = LAYERS.map((layer) => ({
    el: `mark-${layer}`,
    name: `mark-${layer}-loop`,
    delay: DELAY,
    duration: CYCLE,
    iterations: 'infinite',
  }));
  const byLayer = (a, b) => a.el.localeCompare(b.el);

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'loop');
  });

  test('the six layers run their -loop animations forever, and the pause control is on the page', async ({ page }) => {
    expect((await animationTimings(page)).sort(byLayer)).toEqual([...loopTimings].sort(byLayer));
    expect(await runningAnimations(page)).toBe(6);
    await expect(page.getByRole('button', { name: 'Pause motion', exact: true })).toBeVisible();
  });

  test('hover and keyboard focus add no replay run while the mark loops', async ({ page }) => {
    await page.locator('.site-header .brand').hover();
    expect((await animationTimings(page)).sort(byLayer)).toEqual([...loopTimings].sort(byLayer));
    await page.locator('.site-header .brand').focus();
    expect((await animationTimings(page)).sort(byLayer)).toEqual([...loopTimings].sort(byLayer));
  });

  for (const colorScheme of ['light', 'dark']) {
    test.describe(`${colorScheme} scheme`, () => {
      test.use({ colorScheme });

      test('the loop point is seamless: the mark eases back to its start state, with no blink at the wrap-around', async ({ page }) => {
        const start = await markAt(page, 0); // inside the delay: the "backwards" fill shows the 0% keyframe
        expect(start.traceOpacity).toBeCloseTo(0.22, 5);
        expect(start.nodeFill).toBe(NODE_OFF[colorScheme]);
        expect(start.effects).toEqual([0, 0, 0, 0]);

        const before = await markAt(page, DELAY + CYCLE - 2);
        const after = await markAt(page, DELAY + CYCLE + 2);
        for (const [label, sample] of Object.entries({ before, after })) {
          expect(Math.abs(sample.traceOpacity - start.traceOpacity), `trace opacity just ${label} the loop point`).toBeLessThan(0.02);
          expect(colourDistance(sample.nodeFill, start.nodeFill), `node colour just ${label} the loop point`).toBeLessThanOrEqual(3);
          expect(Math.max(...sample.effects), `effect layers just ${label} the loop point`).toBeLessThan(0.02);
        }

        // It is an ease, not a jump: just before 96% the mark still rests; halfway through the last 4% it is in between.
        const restEnd = await markAt(page, DELAY + CYCLE * 0.955);
        expect(restEnd.traceOpacity).toBe(1);
        expect(restEnd.nodeFill).toBe(NODE[colorScheme]);
        const halfway = await markAt(page, DELAY + CYCLE * 0.98);
        expect(halfway.traceOpacity).toBeGreaterThan(0.3);
        expect(halfway.traceOpacity).toBeLessThan(0.9);
        expect(halfway.effects).toEqual([0, 0, 0, 0]);
      });

      test('between passes the mark rests as the static mark: ink trace plus amber node', async ({ page }) => {
        // Mid-scan the spectrum is lit (so the loop really animates) …
        const scanning = await markAt(page, DELAY + 1500);
        expect(scanning.effects[0]).toBe(1);
        // … and from the end of the scan to the last 4% of the cycle nothing but the static mark shows, in every cycle.
        for (const time of [DELAY + SCAN + 5, DELAY + CYCLE * 0.75, DELAY + CYCLE * 0.955, DELAY + CYCLE + SCAN + 1000]) {
          const rest = await markAt(page, time);
          expect(rest, `at ${time} ms`).toEqual({ traceOpacity: 1, traceStroke: INK[colorScheme], nodeFill: NODE[colorScheme], effects: [0, 0, 0, 0] });
        }
        await markAt(page, DELAY + CYCLE * 0.75);
        await expectRestState(page, colorScheme);
      });
    });
  }
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the mark has no animations, even on hover', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'loop');
    await expect.poll(() => page.locator(MARK).evaluate((svg) => svg.getAnimations({ subtree: true }).length)).toBe(0);
    await page.locator('.site-header .brand').hover();
    expect(await page.locator(MARK).evaluate((svg) => svg.getAnimations({ subtree: true }).length)).toBe(0);
  });

  test.describe('without JS', () => {
    test.use({ javaScriptEnabled: false });

    test('the mark has no animations, even on hover', async ({ page }) => {
      await page.goto('/');
      expect(await page.locator(MARK).evaluate((svg) => svg.getAnimations({ subtree: true }).length)).toBe(0);
      await page.locator('.site-header .brand').hover();
      expect(await page.locator(MARK).evaluate((svg) => svg.getAnimations({ subtree: true }).length)).toBe(0);
    });
  });
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
