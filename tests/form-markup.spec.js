import { test, expect } from '@playwright/test';
import { ACCESS_KEY, SUCCESS_TEXT } from './helpers.js';

const REDIRECT = 'https://outcoretech.com/#message-sent';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('form posts to Web3Forms', async ({ page }) => {
  const form = page.locator('form#contact-form');
  await expect(form).toHaveAttribute('action', 'https://api.web3forms.com/submit');
  await expect(form).toHaveAttribute('method', 'POST');
});

test('hidden fields carry the key, subject, sender name and a same-domain redirect', async ({ page }) => {
  const hidden = (name) => page.locator(`#contact-form input[type="hidden"][name="${name}"]`);
  await expect(hidden('access_key')).toHaveValue(ACCESS_KEY);
  await expect(hidden('subject')).toHaveValue('New inquiry – Outcore Tech');
  await expect(hidden('from_name')).toHaveValue('Outcore Tech website');
  await expect(hidden('redirect')).toHaveValue(REDIRECT);
  await expect(page.locator('#contact-form [name="replyto"]')).toHaveCount(0);
});

test('honeypot is a hidden checkbox that keyboard users cannot reach', async ({ page }) => {
  const trap = page.locator('#contact-form input[name="botcheck"]');
  await expect(trap).toHaveAttribute('type', 'checkbox');
  await expect(trap).toHaveAttribute('hidden', '');
  await expect(trap).toHaveAttribute('tabindex', '-1');
  await expect(trap).toHaveAttribute('autocomplete', 'off');
  await expect(trap).toBeHidden();
});

test('visible fields use the spec names, types, limits and autocomplete', async ({ page }) => {
  const props = (locator) =>
    locator.evaluate((el) => ({
      name: el.name,
      type: el.type,
      autocomplete: el.getAttribute('autocomplete'),
      minLength: el.minLength,
      maxLength: el.maxLength,
      required: el.required,
    }));
  expect(await props(page.getByLabel('Name', { exact: true }))).toEqual({
    name: 'name', type: 'text', autocomplete: 'name', minLength: -1, maxLength: 100, required: true,
  });
  expect(await props(page.getByLabel('Email', { exact: true }))).toEqual({
    name: 'email', type: 'email', autocomplete: 'email', minLength: -1, maxLength: 254, required: true,
  });
  expect(await props(page.getByLabel('Company (optional)'))).toEqual({
    name: 'company', type: 'text', autocomplete: 'organization', minLength: -1, maxLength: 120, required: false,
  });
  expect(await props(page.getByLabel('Message'))).toEqual({
    name: 'message', type: 'textarea', autocomplete: null, minLength: 10, maxLength: 5000, required: true,
  });
  await expect(page.getByLabel('Message')).toHaveAttribute('rows', '6');
});

test('service select starts on a disabled placeholder so "required" is enforced', async ({ page }) => {
  const select = page.getByLabel('What do you need help with?');
  await expect(select).toHaveAttribute('name', 'service');
  await expect(select.locator('option')).toHaveText([
    'Choose one…', 'AI Engineering', 'IoT Prototyping', 'Systems Automation',
    'Production Process Optimization', 'Not sure yet',
  ]);
  const placeholder = select.locator('option').first();
  await expect(placeholder).toHaveAttribute('value', '');
  await expect(placeholder).toHaveAttribute('disabled', '');
  expect(await select.evaluate((s) => s.required && s.validity.valueMissing)).toBe(true);
});

test('button, privacy note and empty live regions', async ({ page }) => {
  await expect(page.locator('#contact-form button[type="submit"]')).toHaveText('Send message');
  await expect(page.locator('.form-privacy')).toHaveText(
    "I'll use these details only to reply to you. The form is delivered by Web3Forms. This site sets no cookies and uses no analytics.",
  );
  await expect(page.locator('#contact-form .form-status')).toHaveAttribute('role', 'status');
  await expect(page.locator('#contact-form .form-status')).toBeEmpty();
  await expect(page.locator('#contact-form .form-error')).toHaveAttribute('role', 'alert');
  await expect(page.locator('#contact-form .form-error')).toBeEmpty();
});

test('the contact address is not visible anywhere on load', async ({ page }) => {
  await expect(page.getByText('contact@outcoretech.com')).toHaveCount(0);
});

test('the no-JS confirmation shows only when #message-sent is targeted', async ({ page }) => {
  const sent = page.locator('#message-sent');
  await expect(sent).toBeHidden();
  await page.goto('/#message-sent');
  await expect(sent).toBeVisible();
  await expect(sent).toHaveText(SUCCESS_TEXT);
});

test('form layout holds at 320 px with a long unbroken company name', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.getByLabel('Company (optional)').fill('X'.repeat(120));
  // Scoped to the contact section: the header only collapses below 720 px from Task 10;
  // the page-wide 320 px check lives in tests/layout-a11y.spec.js (Task 12).
  const overflow = await page.locator('#contact').evaluate((el) => el.scrollWidth - el.clientWidth);
  expect(overflow).toBe(0);
});
