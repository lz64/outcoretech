/* Outcore Tech — progressive enhancement only.
   Without this file the nav falls back to nojs.css and the form to a native POST (spec §3.1, §5.3). */
(() => {
  'use strict';

  const SEND_TIMEOUT_MS = 15000;
  const SUCCESS_TEXT = "Thanks — your message is on its way. I'll be in touch soon.";

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

  initNav();
  initContactForm();
})();
