import { test, expect } from '@playwright/test';

// Spec §4.5: a page starts in the finite motion state, and site.js (deferred) switches it to "loop". Each loop
// timeline starts with its finite timeline, so site.js carries the animation clock over: when it arrives late,
// the loop continues from where the one-time animation was, and nothing restarts or snaps.
// site.js is held back with page.route. CSS animations run on real time, so these tests compare clocks read
// just before and right after the switch, with a tolerance, and never expect exact values.
const LAYERS = ['trace', 'bloom', 'lit', 'flare', 'node', 'beam'];
const DELAY = 250; // logo: start delay, one scan, one loop cycle (ms)
const SCAN = 3400;
const CYCLE = 6500;
const PULSE_DELAY = 100; // hero pulse: start delay, one pass, one loop cycle (ms)
const PASS = 2400;
const PULSE_CYCLE = 3200;
const TOLERANCE = 250;

// window.__snapshot() reads the clocks and the look of the mark and the pulse. window.__switched collects one
// snapshot per change of data-motion, taken in the same task as the change (a MutationObserver callback runs
// when site.js returns, before the next frame), so it shows exactly what the first frame after the switch paints.
const instrument = (page) =>
  page.addInitScript((layers) => {
    const clocks = (el) => (el ? el.getAnimations().map((a) => ({ name: a.animationName, time: a.currentTime, state: a.playState })) : []);
    window.__snapshot = () => {
      const mark = document.querySelector('.site-header .brand .mark');
      const pulse = document.querySelector('.sch-pulse');
      const state = document.documentElement.dataset.motion ?? null;
      // The inline head script can set "paused" before <body> is parsed: nothing to read yet.
      if (!mark) return { now: performance.now(), state, mark: [], pulse: [] };
      const style = (selector) => getComputedStyle(mark.querySelector(selector));
      return {
        now: performance.now(),
        state,
        mark: layers.flatMap((layer) => clocks(mark.querySelector(`.mark-${layer}`))),
        litOffset: Number.parseFloat(style('.mark-lit').strokeDashoffset),
        traceOpacity: Number(style('.mark-trace').opacity),
        nodeFill: style('.mark-node').fill,
        effects: ['.mark-lit', '.mark-bloom', '.mark-flare', '.mark-beam'].map((selector) => Number(style(selector).opacity)),
        pulse: clocks(pulse),
        pulseOffset: pulse ? Number.parseFloat(getComputedStyle(pulse).strokeDashoffset) : null,
      };
    };
    window.__switched = [];
    new MutationObserver(() => window.__switched.push(window.__snapshot())).observe(document, {
      attributes: true,
      subtree: true,
      attributeFilter: ['data-motion'],
    });
  }, LAYERS);

// Holds site.js back until the returned function is called.
const holdSiteJs = async (page) => {
  let release;
  const held = new Promise((resolve) => { release = resolve; });
  await page.route('**/assets/js/site.js', async (route) => {
    await held;
    await route.continue();
  });
  return release;
};

// Waits (on real time) until the finite animation on `selector` has reached `time` ms …
const untilClock = (page, selector, time) =>
  page.waitForFunction(([sel, t]) => document.querySelector(sel)?.getAnimations()[0]?.currentTime >= t, [selector, time]);
// … or until the page is `time` ms old and the finite animation declared on `selector` is over.
const untilFinished = (page, selector, time) =>
  page.waitForFunction(
    ([sel, t]) => {
      const el = document.querySelector(sel);
      return el && document.timeline.currentTime >= t && getComputedStyle(el).animationName !== 'none' && el.getAnimations().length === 0;
    },
    [selector, time],
    { timeout: 15000 },
  );

// Releases site.js and returns the snapshots taken just before the release and right after the switch to "loop".
const handover = async (page, release) => {
  const before = await page.evaluate(() => window.__snapshot());
  expect(before.state, 'site.js has not run yet').toBeNull();
  release();
  await page.waitForFunction(() => window.__switched.length > 0);
  const switched = await page.evaluate(() => window.__switched);
  expect(switched).toHaveLength(1);
  expect(switched[0].state).toBe('loop');
  return { before, after: switched[0], elapsed: switched[0].now - before.now };
};

// A colour token, resolved by the page.
const token = (page, name) =>
  page.evaluate((property) => {
    const probe = document.createElement('span');
    probe.style.color = `var(${property})`;
    document.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  }, name);

const names = (clocks) => clocks.map((a) => a.name);
// The one clock that a group of animations shares.
const sharedClock = (clocks, label) => {
  const times = [...new Set(clocks.map((a) => a.time))];
  expect(times, `${label}: one shared clock`).toHaveLength(1);
  return times[0];
};

for (const path of ['/', '/missing/x']) {
  test(`${path}: logo, site.js arrives mid-scan: the loop continues the scan instead of restarting it`, async ({ page }) => {
    await instrument(page);
    const release = await holdSiteJs(page);
    await page.goto(path, { waitUntil: 'commit' });
    await untilClock(page, '.mark-lit', 1500);
    const { before, after, elapsed } = await handover(page, release);

    expect(names(before.mark)).toEqual(LAYERS.map((layer) => `mark-${layer}`));
    const t = sharedClock(before.mark, 'finite');
    expect(t + elapsed, 'the handover happened mid-scan').toBeLessThan(DELAY + SCAN);

    // The six loop animations share one clock, and it carries on from the finite clock. It is not near 0.
    expect(names(after.mark)).toEqual(LAYERS.map((layer) => `mark-${layer}-loop`));
    const carried = sharedClock(after.mark, 'loop');
    expect(carried).toBeGreaterThanOrEqual(t);
    expect(Math.abs(carried - (t + elapsed))).toBeLessThanOrEqual(TOLERANCE);
    expect(carried).toBeGreaterThan(1000);

    // The mark does not return to the start state (line unwritten at dashoffset 1, node unlit).
    expect(after.litOffset).toBeLessThan(0.5);
    expect(after.effects[0], 'the spectrum line stays lit').toBe(1);
    expect(after.nodeFill).not.toBe(await token(page, '--signal-node-off'));

    // And the loop keeps running from there.
    await page.waitForTimeout(300);
    const later = await page.evaluate(() => window.__snapshot());
    expect(later.mark.every((a) => a.state === 'running')).toBe(true);
    expect(sharedClock(later.mark, 'loop, later')).toBeGreaterThan(carried + 100);
  });
}

test('logo, site.js arrives after the scan finished: the mark stays at rest, with no dim snap', async ({ page }) => {
  test.slow();
  await instrument(page);
  const release = await holdSiteJs(page);
  await page.goto('/', { waitUntil: 'commit' });
  await untilFinished(page, '.mark-lit', 4300);
  const { before, after } = await handover(page, release);
  expect(before.mark).toEqual([]);

  const node = await token(page, '--signal-node');
  const inRest = (time) => time >= DELAY + SCAN && time < DELAY + CYCLE * 0.96;
  // Right after the switch: the loop clock is in its rest phase and the mark is the static mark.
  expect(names(after.mark)).toEqual(LAYERS.map((layer) => `mark-${layer}-loop`));
  expect(inRest(sharedClock(after.mark, 'loop')), `rest phase (${after.mark[0].time} ms)`).toBe(true);
  expect(after.traceOpacity).toBe(1);
  expect(after.nodeFill).toBe(node);
  for (const opacity of after.effects) expect(opacity).toBeLessThan(0.01);

  // Still at rest about 600 ms later.
  await page.waitForTimeout(600);
  const later = await page.evaluate(() => window.__snapshot());
  expect(inRest(sharedClock(later.mark, 'loop, later')), `rest phase (${later.mark[0].time} ms)`).toBe(true);
  expect({ traceOpacity: later.traceOpacity, nodeFill: later.nodeFill, effects: later.effects }).toEqual({ traceOpacity: 1, nodeFill: node, effects: [0, 0, 0, 0] });
});

test('logo, site.js arrives during a hover replay: the loop continues the replay, the last animation listed', async ({ page }) => {
  test.slow();
  await instrument(page);
  const release = await holdSiteJs(page);
  await page.goto('/', { waitUntil: 'commit' });
  await untilFinished(page, '.mark-lit', 4300);
  await page.locator('.site-header .brand').hover();
  await page.waitForFunction(() => document.querySelector('.mark-lit').getAnimations().some((a) => a.animationName === 'mark-lit-r' && a.currentTime >= 1200));
  const { before, after, elapsed } = await handover(page, release);

  expect(names(before.mark)).toEqual(LAYERS.map((layer) => `mark-${layer}-r`));
  const t = sharedClock(before.mark, 'replay');
  expect(t + elapsed, 'the handover happened mid-replay').toBeLessThan(SCAN);
  // The replay has no start delay and the loop has one, so the same point of the scan is 250 ms later on the loop's clock.
  const carried = sharedClock(after.mark, 'loop');
  expect(carried).toBeGreaterThanOrEqual(t + DELAY);
  expect(Math.abs(carried - (t + DELAY + elapsed))).toBeLessThanOrEqual(TOLERANCE);
  expect(after.litOffset).toBeLessThan(0.5);
  expect(after.effects[0], 'the spectrum line stays lit').toBe(1);
});

// The finite pulse plays two passes; the loop plays the same pass, then rests. The handover keeps the point of the pass.
for (const [label, at, pass] of [['first', 1200, 0], ['second', 3300, 1]]) {
  test(`hero pulse, site.js arrives in the ${label} pass: the loop continues the same point of the pass`, async ({ page }) => {
    test.slow();
    await instrument(page);
    const release = await holdSiteJs(page);
    await page.goto('/', { waitUntil: 'commit' });
    await untilClock(page, '.sch-pulse', at);
    const { before, after, elapsed } = await handover(page, release);

    expect(names(before.pulse)).toEqual(['sch-pulse']);
    const t = before.pulse[0].time;
    expect(t, `the handover happened in the ${label} pass`).toBeGreaterThanOrEqual(PULSE_DELAY + pass * PASS);
    expect(t + elapsed, `the handover happened in the ${label} pass`).toBeLessThan(PULSE_DELAY + (pass + 1) * PASS);

    // The loop's pass is at the same point as the finite pass was (the second pass maps onto the loop's one pass).
    const inPass = (time) => (time - PULSE_DELAY) % PASS;
    expect(names(after.pulse)).toEqual(['sch-pulse-loop']);
    const carried = after.pulse[0].time;
    expect(carried).toBeGreaterThanOrEqual(PULSE_DELAY + inPass(t));
    expect(Math.abs(carried - (PULSE_DELAY + inPass(t + elapsed)))).toBeLessThanOrEqual(TOLERANCE);

    // The dash does not jump back to its start (offset 6, before the path): it is on the path, at or past where it was.
    expect(before.pulseOffset).toBeLessThan(0);
    expect(after.pulseOffset).toBeLessThan(0);
    expect(after.pulseOffset).toBeLessThanOrEqual(before.pulseOffset + 0.5);
  });
}

test('hero pulse, site.js arrives after both passes finished: the loop starts in its rest, not with an immediate pass', async ({ page }) => {
  test.slow();
  await instrument(page);
  const release = await holdSiteJs(page);
  await page.goto('/', { waitUntil: 'commit' });
  await untilFinished(page, '.sch-pulse', 5500);
  const { before, after } = await handover(page, release);
  expect(before.pulse).toEqual([]);

  expect(names(after.pulse)).toEqual(['sch-pulse-loop']);
  const carried = after.pulse[0].time;
  expect(carried, 'rest phase').toBeGreaterThanOrEqual(PULSE_DELAY + PASS);
  expect(carried, 'rest phase').toBeLessThan(PULSE_DELAY + PULSE_CYCLE);
  // The dash waits past the end of the path (pathLength 100), where the loop rests between passes.
  expect(after.pulseOffset).toBeLessThan(-100);
  // The logo finished too, so it rests as well.
  expect(sharedClock(after.mark, 'loop')).toBeGreaterThanOrEqual(DELAY + SCAN);
});

// The same mapping, checked exactly: with the finite animations frozen at a known time, no real time passes
// between the read and the switch. (A paused animation is still an unfinished one, so site.js treats it as running.)
for (const [label, markTime, pulseTime] of [
  ['inside the start delays (what is left of each delay is kept)', 100, 40],
  ['mid-scan, and in the second pass of the pulse', 2000, 3300],
  ['on the last millisecond of the scan and of the first pass', DELAY + SCAN - 1, PULSE_DELAY + PASS - 1],
]) {
  test(`the carried clock is exact: ${label}`, async ({ page }) => {
    await instrument(page);
    const release = await holdSiteJs(page);
    await page.goto('/', { waitUntil: 'commit' });
    await untilClock(page, '.sch-pulse', 0);
    await untilClock(page, '.mark-beam', 0);
    await page.evaluate(([mark, pulse]) => {
      for (const animation of document.getAnimations()) {
        animation.pause();
        animation.currentTime = animation.animationName === 'sch-pulse' ? pulse : mark;
      }
    }, [markTime, pulseTime]);
    const { before, after } = await handover(page, release);
    expect(before.mark).toHaveLength(6);
    expect(sharedClock(before.mark, 'finite')).toBe(markTime);
    expect(before.pulse[0].time).toBe(pulseTime);

    // Logo: both delays are 250 ms and the scan is the loop's first 3.4 s, so the clock is simply the same.
    expect(names(after.mark)).toEqual(LAYERS.map((layer) => `mark-${layer}-loop`));
    expect(sharedClock(after.mark, 'loop')).toBeCloseTo(markTime, 6);
    // Pulse: the same point of the pass; a second pass maps onto the loop's one pass.
    const inPass = pulseTime < PULSE_DELAY ? pulseTime - PULSE_DELAY : (pulseTime - PULSE_DELAY) % PASS;
    expect(after.pulse[0].time).toBeCloseTo(PULSE_DELAY + inPass, 6);
    // The look does not change at the switch.
    expect(after.litOffset).toBeCloseTo(before.litOffset, 3);
    expect(after.traceOpacity).toBeCloseTo(before.traceOpacity, 3);
    expect(after.nodeFill).toBe(before.nodeFill);
    after.effects.forEach((opacity, i) => expect(opacity).toBeCloseTo(before.effects[i], 3));
    expect(Math.abs(after.pulseOffset - before.pulseOffset)).toBeLessThanOrEqual(1);
  });
}

test('"Play motion" starts both loops from the beginning: the clock is carried over only at page load', async ({ page }) => {
  await instrument(page);
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'loop');
  await untilClock(page, '.mark-lit', 1500);
  const button = page.locator('.motion-toggle');
  await button.click();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'paused');
  await button.click();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'loop');

  const switched = await page.evaluate(() => window.__switched);
  expect(switched.map((s) => s.state)).toEqual(['loop', 'paused', 'loop']);
  const fresh = switched[2];
  expect(names(fresh.mark)).toEqual(LAYERS.map((layer) => `mark-${layer}-loop`));
  expect(sharedClock(fresh.mark, 'loop')).toBeLessThan(500);
  expect(names(fresh.pulse)).toEqual(['sch-pulse-loop']);
  expect(fresh.pulse[0].time).toBeLessThan(500);
  // Shortly after the click the clocks are still young.
  const now = await page.evaluate(() => window.__snapshot());
  expect(sharedClock(now.mark, 'loop, now')).toBeLessThan(500);
  expect(now.pulse[0].time).toBeLessThan(500);
});

test.describe('nothing to carry over', () => {
  const pageErrors = (page) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    return errors;
  };

  for (const path of ['/', '/missing/x']) {
    test.describe('reduced motion', () => {
      test.use({ reducedMotion: 'reduce' });

      test(`${path}: a late site.js finds no animations, sets "loop" without error, and nothing animates`, async ({ page }) => {
        const errors = pageErrors(page);
        await instrument(page);
        const release = await holdSiteJs(page);
        await page.goto(path, { waitUntil: 'commit' });
        await page.waitForFunction(() => document.querySelector('.site-footer') !== null && document.timeline.currentTime >= 600);
        const { before, after } = await handover(page, release);
        await page.waitForLoadState('load');
        const later = await page.evaluate(() => window.__snapshot());
        for (const snapshot of [before, after, later]) {
          expect(snapshot.mark).toEqual([]);
          expect(snapshot.pulse).toEqual([]);
        }
        expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
        expect(errors).toEqual([]);
      });
    });

    test(`${path}: with a stored "paused" choice a late site.js starts no animation and throws nothing`, async ({ page }) => {
      const errors = pageErrors(page);
      await instrument(page);
      await page.addInitScript(() => localStorage.setItem('motion', 'paused'));
      const release = await holdSiteJs(page);
      await page.goto(path, { waitUntil: 'commit' });
      await page.waitForFunction(() => document.querySelector('.site-footer') !== null && document.timeline.currentTime >= 600);
      expect(await page.evaluate(() => document.documentElement.dataset.motion)).toBe('paused');
      release();
      await page.waitForLoadState('load');
      await expect(page.locator('.motion-toggle')).toBeVisible();
      await expect(page.locator('.motion-toggle')).toHaveAccessibleName('Play motion');
      await expect(page.locator('html')).toHaveAttribute('data-motion', 'paused');
      expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
      expect(errors).toEqual([]);
    });
  }
});
