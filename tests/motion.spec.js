import { test, expect } from '@playwright/test';
import { fontsReady } from './helpers.js';

// Spec §3.1 / §4.5: both pulses loop while site.js runs, so WCAG 2.2.2 needs a pause mechanism: the quiet
// "Pause motion" button at the far left of the top bar, opposite בס״ד, on every page. The state lives in
// data-motion on <html> ("loop" / "paused"; absent without JS) and the choice is kept in localStorage.
const MARK = '.site-header .brand .mark';
const INK = 'rgb(18, 22, 27)';
const NODE = 'rgb(245, 163, 15)';
const PAGES = ['/', '/missing/x'];

const html = (page) => page.locator('html');
const toggle = (page) => page.locator('.bsd-bar .motion-toggle');
const animations = (page) => page.evaluate(() => document.getAnimations().map((a) => a.animationName));
const stored = (page) => page.evaluate(() => localStorage.getItem('motion'));

const expectLooping = async (page, path = '/') => {
  await expect(html(page)).toHaveAttribute('data-motion', 'loop');
  await expect(toggle(page)).toHaveAccessibleName('Pause motion');
  await expect(toggle(page).locator('.motion-label')).toHaveText('Pause motion');
  const names = await animations(page);
  expect(names.filter((name) => name.startsWith('mark-')).sort()).toEqual(
    ['mark-beam-loop', 'mark-bloom-loop', 'mark-flare-loop', 'mark-lit-loop', 'mark-node-loop', 'mark-trace-loop'],
  );
  expect(names.filter((name) => name.startsWith('sch-'))).toEqual(path === '/' ? ['sch-pulse-loop'] : []);
  expect(await page.evaluate(() => document.getAnimations().every((a) => a.playState === 'running'))).toBe(true);
};

const expectPaused = async (page, path = '/') => {
  await expect(html(page)).toHaveAttribute('data-motion', 'paused');
  await expect(toggle(page)).toHaveAccessibleName('Play motion');
  await expect(toggle(page).locator('.motion-label')).toHaveText('Play motion');
  // Nothing moves anywhere on the page …
  expect(await animations(page)).toEqual([]);
  // … the mark shows its rest state: the ink trace plus the amber node, every effect layer invisible …
  const mark = page.locator(MARK);
  for (const layer of ['.mark-lit', '.mark-bloom', '.mark-flare', '.mark-beam']) {
    await expect(mark.locator(layer), layer).toHaveCSS('opacity', '0');
    await expect(mark.locator(layer), layer).toHaveCSS('animation-name', 'none');
  }
  await expect(mark.locator('.mark-trace')).toHaveCSS('stroke', INK);
  await expect(mark.locator('.mark-trace')).toHaveCSS('opacity', '1');
  await expect(mark.locator('.mark-node')).toHaveCSS('fill', NODE);
  // … and the hero pulse's dash stays off the path (pathLength 100, dash 6: offset 6 parks it before the start).
  if (path === '/') {
    await expect(page.locator('.sch-pulse')).toHaveCSS('animation-name', 'none');
    await expect(page.locator('.sch-pulse')).toHaveCSS('stroke-dashoffset', '6px');
    await expect(page.locator('.sch-pulse')).toHaveCSS('stroke-dasharray', '6px, 200px');
  }
};

for (const path of PAGES) {
  test.describe(`${path}`, () => {
    for (const width of [375, 1440]) {
      test(`the pause control sits at the far left of the top bar, opposite בס״ד, above the header at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 });
        await page.goto(path);
        await fontsReady(page);
        const button = page.getByRole('button', { name: 'Pause motion', exact: true });
        await expect(button).toBeVisible();
        await expect(button).toHaveCount(1);
        await expect(toggle(page)).toHaveAccessibleName('Pause motion');
        expect(await toggle(page).getAttribute('aria-pressed')).toBeNull();
        expect(await toggle(page).getAttribute('type')).toBe('button');

        const box = await toggle(page).boundingBox();
        const bar = await page.locator('.bsd-bar').boundingBox();
        const bsd = await page.locator('.bsd').boundingBox();
        const header = await page.locator('.site-header').boundingBox();
        const gutter = width < 480 ? 16 : width < 1024 ? 24 : 32;
        // Far left: the icon starts on the page gutter and the button's box stays on screen.
        const icon = await toggle(page).locator('.motion-icon').boundingBox();
        expect(icon.x).toBeCloseTo(gutter, 0);
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x).toBeLessThanOrEqual(40);
        expect(box.x + box.width).toBeLessThan(bsd.x);
        // בס״ד is still at the far right.
        expect(width - (bsd.x + bsd.width)).toBeLessThanOrEqual(40);
        expect(width - (bsd.x + bsd.width)).toBeGreaterThanOrEqual(0);
        // Inside the bar, above the header.
        expect(box.y).toBeGreaterThanOrEqual(bar.y);
        expect(box.y + box.height).toBeLessThanOrEqual(header.y);
        expect(bar.y + bar.height).toBe(header.y);
        // Target size: the full height of the thin bar (≥ 24 px, WCAG 2.5.8) and at least 44 px wide.
        expect(box.height).toBeGreaterThanOrEqual(24);
        expect(box.height).toBe(bar.height);
        expect(box.width).toBeGreaterThanOrEqual(44);
        // The label lines up with בס״ד across the bar.
        const label = await toggle(page).locator('.motion-label').boundingBox();
        expect(Math.abs(label.y + label.height / 2 - (bsd.y + bsd.height / 2))).toBeLessThanOrEqual(1.5);
      });
    }

    test('the control is quiet: muted text, no background or border, a pointer cursor, underlined on hover', async ({ page }) => {
      await page.goto(path);
      const muted = await page.locator('.bsd').evaluate((el) => getComputedStyle(el).color);
      await expect(toggle(page)).toHaveCSS('color', muted);
      await expect(toggle(page)).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
      await expect(toggle(page)).toHaveCSS('border-top-width', '0px');
      await expect(toggle(page)).toHaveCSS('cursor', 'pointer');
      await expect(toggle(page)).toHaveCSS('font-size', '13px');
      await expect(toggle(page)).toHaveCSS('font-family', /^"IBM Plex Sans"/);
      await expect(toggle(page).locator('.motion-label')).toHaveCSS('text-decoration-line', 'none');
      await toggle(page).hover();
      await expect(toggle(page).locator('.motion-label')).toHaveCSS('text-decoration-line', 'underline');
    });

    test('clicking pauses everything; clicking again resumes', async ({ page }) => {
      await page.goto(path);
      await expectLooping(page, path);
      await expect(toggle(page).locator('.motion-icon-pause')).toBeVisible();
      await expect(toggle(page).locator('.motion-icon-play')).toBeHidden();

      await toggle(page).click();
      await expectPaused(page, path);
      expect(await stored(page)).toBe('paused');
      await expect(toggle(page).locator('.motion-icon-pause')).toBeHidden();
      await expect(toggle(page).locator('.motion-icon-play')).toBeVisible();
      // No hover replay while paused.
      await page.locator('.site-header .brand').hover();
      expect(await animations(page)).toEqual([]);

      await toggle(page).click();
      await expectLooping(page, path);
      expect(await stored(page)).toBe('loop');
    });

    test('keyboard: skip link, then the motion button, then the brand; Enter and Space toggle it', async ({ page }) => {
      await page.goto(path);
      await expect(html(page)).toHaveAttribute('data-motion', 'loop');
      await page.keyboard.press('Tab');
      await expect(page.locator('.skip-link')).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(toggle(page)).toBeFocused();
      await expect(toggle(page)).toHaveCSS('outline-style', 'solid');
      await expect(toggle(page)).toHaveCSS('outline-width', '2px');

      await page.keyboard.press('Enter');
      await expectPaused(page, path);
      await expect(toggle(page)).toBeFocused();
      await page.keyboard.press('Space');
      await expectLooping(page, path);
      await page.keyboard.press('Space');
      await expectPaused(page, path);
      await page.keyboard.press('Enter');
      await expectLooping(page, path);

      await page.keyboard.press('Tab');
      await expect(page.locator('.site-header .brand')).toBeFocused();
    });

    test('the focus ring is drawn inside the bar, so the viewport edge and the header cannot clip it', async ({ page }) => {
      await page.goto(path);
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await expect(toggle(page)).toBeFocused();
      const ring = await toggle(page).evaluate((el) => {
        const s = getComputedStyle(el);
        const box = el.getBoundingClientRect();
        const grow = parseFloat(s.outlineOffset) + parseFloat(s.outlineWidth);
        return { top: box.top - grow, bottom: box.bottom + grow, left: box.left - grow, color: s.outlineColor };
      });
      const header = await page.locator('.site-header').boundingBox();
      expect(ring.top).toBeGreaterThanOrEqual(0);
      expect(ring.left).toBeGreaterThanOrEqual(0);
      expect(ring.bottom).toBeLessThanOrEqual(header.y);
      const focus = await page.evaluate(() => {
        const probe = document.createElement('span');
        probe.style.color = 'var(--focus)';
        document.body.append(probe);
        const color = getComputedStyle(probe).color;
        probe.remove();
        return color;
      });
      expect(ring.color).toBe(focus);
    });
  });
}

test('the choice survives a reload and can be undone', async ({ page }) => {
  await page.goto('/');
  await toggle(page).click();
  await expectPaused(page);
  await page.reload();
  await expectPaused(page);
  await toggle(page).click();
  await expectLooping(page);
  await page.reload();
  await expectLooping(page);
});

test('a visitor who paused never sees motion on the next page: the inline head script applies the choice before site.js runs', async ({ page }) => {
  await page.goto('/');
  await toggle(page).click();
  await expectPaused(page);

  // Record every animation that starts, and the state when DOMContentLoaded fires.
  await page.addInitScript(() => {
    window.__motion = { started: [], atDomContentLoaded: undefined };
    document.addEventListener('animationstart', (event) => window.__motion.started.push(event.animationName), true);
    document.addEventListener('DOMContentLoaded', () => {
      window.__motion.atDomContentLoaded = document.documentElement.dataset.motion ?? null;
    });
  });
  // Hold site.js back: while it is pending, only the inline script in <head> can have set the state.
  let release;
  const held = new Promise((resolve) => { release = resolve; });
  await page.route('**/assets/js/site.js', async (route) => {
    await held;
    await route.continue();
  });

  await page.goto('/missing/x', { waitUntil: 'commit' });
  await expect.poll(() => page.evaluate(() => document.querySelector('.site-footer') !== null)).toBe(true);
  // Longer than both animation delays (0.1 s and 0.25 s): anything that was going to start has started.
  await page.waitForTimeout(600);
  expect(
    await page.evaluate(() => ({
      state: document.documentElement.dataset.motion ?? null,
      domContentLoaded: window.__motion.atDomContentLoaded !== undefined,
      started: window.__motion.started,
      running: document.getAnimations().length,
      buttonHidden: document.querySelector('.motion-toggle').hidden,
    })),
  ).toEqual({ state: 'paused', domContentLoaded: false, started: [], running: 0, buttonHidden: true });

  release();
  await page.waitForLoadState('load');
  await expectPaused(page, '/missing/x');
  await expect(toggle(page)).toBeVisible();
  expect(await page.evaluate(() => window.__motion)).toEqual({ started: [], atDomContentLoaded: 'paused' });

  // And back on the home page, with the hero pulse.
  await page.unroute('**/assets/js/site.js');
  await page.goto('/');
  await expectPaused(page);
  expect(await page.evaluate(() => window.__motion)).toEqual({ started: [], atDomContentLoaded: 'paused' });
});

test('the inline head script only ever sets "paused"; "loop" comes from site.js together with the button', async ({ page }) => {
  await page.route('**/assets/js/site.js', (route) => route.abort());
  await page.goto('/');
  // No stored choice and no site.js: the state is absent, the button stays hidden, the motion is finite.
  expect(await html(page).getAttribute('data-motion')).toBeNull();
  await expect(toggle(page)).toBeHidden();
  await expect(page.locator('.sch-pulse')).toHaveCSS('animation-iteration-count', '2');
  await expect(page.locator('.mark-trace')).toHaveCSS('animation-iteration-count', '1');

  await page.evaluate(() => localStorage.setItem('motion', 'loop'));
  await page.reload();
  expect(await html(page).getAttribute('data-motion')).toBeNull();

  await page.evaluate(() => localStorage.setItem('motion', 'paused'));
  await page.reload();
  await expect(html(page)).toHaveAttribute('data-motion', 'paused');
  expect(await animations(page)).toEqual([]);
});

test('site.js does not start the loop on a page that has no pause control', async ({ page }) => {
  await page.route('**/*', async (route) => {
    if (route.request().resourceType() !== 'document') return route.fallback();
    const response = await route.fetch();
    const body = (await response.text()).replace(/<button type="button" class="motion-toggle"[\s\S]*?<\/button>/, '');
    await route.fulfill({ response, body });
  });
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/');
  await expect(page.locator('.motion-toggle')).toHaveCount(0);
  // site.js did run (the menu button works) …
  await page.locator('.nav-toggle').click();
  await expect(page.locator('.nav-toggle')).toHaveAttribute('aria-expanded', 'true');
  // … but with no way to pause, it left the finite motion alone (WCAG 2.2.2).
  expect(await html(page).getAttribute('data-motion')).toBeNull();
  await expect(page.locator('.sch-pulse')).toHaveCSS('animation-name', 'sch-pulse');
  await expect(page.locator('.sch-pulse')).toHaveCSS('animation-iteration-count', '2');
  await expect(page.locator('.mark-trace')).toHaveCSS('animation-name', 'mark-trace');
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  for (const path of PAGES) {
    test(`${path}: the button is not shown and nothing animates`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('load');
      await expect(toggle(page)).toBeHidden();
      await expect(toggle(page)).toHaveCSS('display', 'none');
      expect(await animations(page)).toEqual([]);
      await page.locator('.site-header .brand').hover();
      expect(await animations(page)).toEqual([]);
      // Tab skips the hidden control.
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await expect(page.locator('.site-header .brand')).toBeFocused();
      // בס״ד stays at the far right.
      const bsd = await page.locator('.bsd').boundingBox();
      const width = page.viewportSize().width;
      expect(width - (bsd.x + bsd.width)).toBeLessThanOrEqual(40);
    });
  }

  test('a stored "paused" choice changes nothing visible either', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('motion', 'paused'));
    await page.reload();
    await expect(toggle(page)).toBeHidden();
    expect(await animations(page)).toEqual([]);
  });
});

test.describe('without JS', () => {
  test.use({ javaScriptEnabled: false });

  for (const path of PAGES) {
    test(`${path}: the button is hidden, data-motion is absent, and the motion is finite`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('.motion-toggle')).toHaveCount(1);
      await expect(toggle(page)).toBeHidden();
      expect(await html(page).getAttribute('data-motion')).toBeNull();
      await expect(page.locator('.mark-trace')).toHaveCSS('animation-name', 'mark-trace');
      await expect(page.locator('.mark-trace')).toHaveCSS('animation-iteration-count', '1');
      if (path === '/') {
        await expect(page.locator('.sch-pulse')).toHaveCSS('animation-name', 'sch-pulse');
        await expect(page.locator('.sch-pulse')).toHaveCSS('animation-iteration-count', '2');
      }
      // Tab goes from the skip link straight to the brand.
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await expect(page.locator('.site-header .brand')).toBeFocused();
      // בס״ד stays at the far right without the button.
      const bsd = await page.locator('.bsd').boundingBox();
      const width = page.viewportSize().width;
      expect(width - (bsd.x + bsd.width)).toBeLessThanOrEqual(40);
      expect(width - (bsd.x + bsd.width)).toBeGreaterThanOrEqual(0);
    });
  }
});

test('when localStorage throws, the page still loops and the button still toggles within the page', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const deny = () => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    };
    Storage.prototype.getItem = deny;
    Storage.prototype.setItem = deny;
  });
  await page.goto('/');
  expect(await page.evaluate(() => { try { localStorage.getItem('motion'); return 'readable'; } catch { return 'throws'; } })).toBe('throws');
  await expect(toggle(page)).toBeVisible();
  await expectLooping(page);
  await toggle(page).click();
  await expectPaused(page);
  await toggle(page).click();
  await expectLooping(page);
  // The rest of site.js still ran: the mobile menu button works.
  await page.setViewportSize({ width: 375, height: 800 });
  await page.locator('.nav-toggle').click();
  await expect(page.locator('.nav-toggle')).toHaveAttribute('aria-expanded', 'true');
  expect(errors).toEqual([]);
});

test('the top bar keeps its height when the button appears, and בס״ד does not move', async ({ page }) => {
  await page.route('**/assets/js/site.js', (route) => route.abort());
  await page.goto('/');
  await fontsReady(page);
  const before = { bar: await page.locator('.bsd-bar').boundingBox(), bsd: await page.locator('.bsd').boundingBox() };
  await page.unroute('**/assets/js/site.js');
  await page.goto('/');
  await fontsReady(page);
  await expect(toggle(page)).toBeVisible();
  expect({ bar: await page.locator('.bsd-bar').boundingBox(), bsd: await page.locator('.bsd').boundingBox() }).toEqual(before);
  expect(before.bar.height).toBe(27);
});
