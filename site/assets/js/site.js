/* Outcore Tech — progressive enhancement only.
   Without this file the nav falls back to nojs.css, the form to a native POST, and the motion to its
   finite run with no pause button (spec §3.1, §4.5, §5.3). */
(() => {
  'use strict';

  const SEND_TIMEOUT_MS = 15000;
  const MOTION_KEY = 'motion'; // localStorage; also read by the inline script in <head>
  const SUCCESS_TEXT = "Thanks — your message is on its way. I'll be in touch soon.";

  // The handover from the one-time animations to the loops at page load (spec §4.5).
  // Invariant, kept by site.css and checked by tools/motion.test.mjs: each loop timeline starts with its finite
  // timeline (the same pass at the same speed, then a rest). So a loop can take over at the point its finite
  // animation has reached, and nothing restarts when this script arrives late. Every duration and delay is read
  // from the CSS; none is repeated here.
  const MOVING = '.mark-trace, .mark-bloom, .mark-lit, .mark-flare, .mark-node, .mark-beam, .sch-pulse';
  const lastOf = (list) => list.split(',').pop().trim(); // a hover replay lists a second animation; the last one shows
  const ms = (time) => Number.parseFloat(time) * (time.endsWith('ms') ? 1 : 1000);

  // Before the switch: the timing of each element's finite animation (the computed style keeps it after the
  // animation has finished) and its clock if it is still running. Elements with no animation (reduced motion,
  // or a browser without getAnimations) are left out.
  function finiteClocks() {
    const clocks = new Map();
    if (!Element.prototype.getAnimations) return clocks;
    for (const element of document.querySelectorAll(MOVING)) {
      const style = getComputedStyle(element);
      if (style.animationName === 'none') continue;
      const running = element.getAnimations().filter((a) => a.playState !== 'finished' && a.currentTime !== null).pop();
      clocks.set(element, {
        delay: ms(lastOf(style.animationDelay)),
        duration: ms(lastOf(style.animationDuration)),
        iterations: Number.parseFloat(lastOf(style.animationIterationCount)),
        time: running ? running.currentTime : null,
      });
    }
    return clocks;
  }

  // After the switch: move each new loop animation to the point its finite animation had reached.
  function continueLoops(clocks) {
    for (const [element, finite] of clocks) {
      const loop = element.getAnimations().pop();
      if (!loop || !loop.effect) continue;
      const passStart = loop.effect.getComputedTiming().delay; // the loop's own start delay
      const active = finite.time === null ? 0 : finite.time - finite.delay; // time since the finite start delay ended
      let time;
      if (finite.time === null || active >= finite.duration * finite.iterations) {
        time = passStart + finite.duration; // finished: the first instant of the loop's rest, so the element stays at rest
      } else if (active < 0) {
        time = passStart + active; // still in the start delay: keep what is left of it
      } else {
        time = passStart + (active % finite.duration); // mid-pass; the modulo maps the hero pulse's second pass onto the loop's one pass
      }
      if (Number.isFinite(time)) loop.currentTime = time;
    }
  }

  // Both pulses loop only while this script runs and the pause control is on the page (WCAG 2.2.2; spec §4.5).
  // The state lives in data-motion on <html>: "loop" or "paused". Without it the CSS keeps the finite motion.
  function initMotion() {
    const root = document.documentElement;
    const button = document.querySelector('.motion-toggle');
    const label = button && button.querySelector('.motion-label');
    // No pause control on this page: a loop could not be stopped, so leave the state as it is.
    if (!label) return;

    const apply = (state) => {
      root.dataset.motion = state;
      label.textContent = state === 'paused' ? 'Play motion' : 'Pause motion';
    };
    let stored = null;
    try {
      stored = localStorage.getItem(MOTION_KEY);
    } catch {
      // Storage is blocked: start looping; the button still works for this page view.
    }
    if (stored === 'paused') {
      apply('paused');
    } else {
      // Only here, at page load, do the loops carry on from the finite animations. "Play motion" starts them fresh.
      const clocks = finiteClocks();
      apply('loop');
      continueLoops(clocks);
    }
    button.hidden = false;

    button.addEventListener('click', () => {
      const next = root.dataset.motion === 'paused' ? 'loop' : 'paused';
      apply(next);
      try {
        localStorage.setItem(MOTION_KEY, next);
      } catch {
        // Storage is blocked: the choice holds until the page is left.
      }
    });
  }

  function initNav() {
    const toggle = document.querySelector('.nav-toggle');
    const nav = document.getElementById('site-nav');
    if (!toggle || !nav) return;
    const desktop = window.matchMedia('(min-width: 45em)');
    const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';
    const setOpen = (open) => toggle.setAttribute('aria-expanded', String(open));

    toggle.addEventListener('click', () => setOpen(!isOpen()));
    nav.addEventListener('click', (event) => {
      if (event.target.closest('a')) setOpen(false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && isOpen()) {
        setOpen(false);
        toggle.focus();
      }
    });
    desktop.addEventListener('change', (event) => {
      if (event.matches) setOpen(false);
    });
  }

  // Resolves true only for an OK response whose JSON body has success === true (spec §5.3 item 2).
  async function send(url, data) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data),
        signal: controller.signal,
      });
      const body = await response.json();
      return response.ok && body !== null && typeof body === 'object' && body.success === true;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  function initContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;
    const button = form.querySelector('button[type="submit"]');
    const status = form.querySelector('.form-status');
    const error = form.querySelector('.form-error');
    const errorTemplate = document.getElementById('form-error-template');
    const idleLabel = button.textContent;
    let sending = false;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (sending || !form.reportValidity()) return;
      sending = true;
      const hadFocus = document.activeElement === button;
      status.textContent = '';
      error.replaceChildren();
      button.disabled = true;
      button.textContent = 'Sending…';

      const data = Object.fromEntries(new FormData(form));
      // The redirect field is for the no-JS fallback only; sent from fetch it makes the API
      // answer with a cross-origin redirect that reports a false failure (spec §5.3).
      delete data.redirect;

      const ok = await send(form.action, data);

      sending = false;
      button.disabled = false;
      button.textContent = idleLabel;
      // Disabling the focused button drops focus to <body>; return it so screen-reader
      // users don't lose their place (unless they moved focus elsewhere while sending).
      if (hadFocus && document.activeElement === document.body) button.focus();
      if (ok) {
        form.reset();
        status.textContent = SUCCESS_TEXT;
      } else {
        error.replaceChildren(errorTemplate.content.cloneNode(true));
      }
    });
  }

  initMotion();
  initNav();
  initContactForm();
})();
