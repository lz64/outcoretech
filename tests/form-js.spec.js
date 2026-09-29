import { test, expect } from '@playwright/test';
import { API, ACCESS_KEY, SUCCESS_TEXT, VISITOR, fillForm } from './helpers.js';

const CORS = { 'access-control-allow-origin': '*' };
const json = (status, body) => ({ status, headers: CORS, contentType: 'application/json', body: JSON.stringify(body) });
const ERROR_TEXT = "Your message didn't go through. Please try again, or email contact@outcoretech.com.";

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('success: sends JSON without the redirect field, then confirms and clears the form', async ({ page }) => {
  let request = null;
  await page.route(API, async (route) => {
    request = route.request();
    await route.fulfill(json(200, { success: true, message: 'Email sent successfully!' }));
  });
  await fillForm(page);
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.locator('.form-status')).toHaveText(SUCCESS_TEXT);
  expect(request.method()).toBe('POST');
  expect(request.headers()['content-type']).toBe('application/json');
  expect(request.headers()['accept']).toBe('application/json');
  expect(request.postDataJSON()).toEqual({
    access_key: ACCESS_KEY,
    subject: 'New inquiry – Outcore Tech',
    from_name: 'Outcore Tech website',
    name: VISITOR.name,
    email: VISITOR.email,
    company: VISITOR.company,
    service: VISITOR.service,
    message: VISITOR.message,
  });
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Message')).toHaveValue('');
  await expect(page.getByLabel('What do you need help with?')).toHaveValue('');
  await expect(page.locator('.form-error')).toBeEmpty();
  await expect(page).toHaveURL(/127\.0\.0\.1:4173\/$/);
});

test('the button says Sending… and is disabled while the request is in flight', async ({ page }) => {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  await page.route(API, async (route) => {
    await gate;
    await route.fulfill(json(200, { success: true }));
  });
  await fillForm(page);
  const button = page.locator('#contact-form button[type="submit"]');
  await button.click();
  await expect(button).toHaveText('Sending…');
  await expect(button).toBeDisabled();
  release();
  await expect(button).toHaveText('Send message');
  await expect(button).toBeEnabled();
});

const FAILURES = {
  'HTTP 500 with an error body': (route) => route.fulfill(json(500, { statusCode: 500, error: 'Internal' })),
  'HTTP 429 rate limit': (route) => route.fulfill(json(429, { success: false, message: 'Too many requests' })),
  'HTTP 403 HTML challenge page': (route) =>
    route.fulfill({ status: 403, headers: CORS, contentType: 'text/html', body: '<html>challenge</html>' }),
  'HTTP 200 with success false': (route) => route.fulfill(json(200, { success: false, message: 'Invalid key' })),
  'HTTP 200 with a non-JSON body': (route) =>
    route.fulfill({ status: 200, headers: CORS, contentType: 'text/plain', body: 'ok' }),
  'HTTP 200 with JSON null': (route) => route.fulfill(json(200, null)),
  'network failure': (route) => route.abort('failed'),
};

for (const [name, respond] of Object.entries(FAILURES)) {
  test(`failure (${name}) shows the error with a mailto link and keeps the input`, async ({ page }) => {
    await page.route(API, respond);
    await fillForm(page);
    await page.getByRole('button', { name: 'Send message' }).click();
    const error = page.locator('.form-error');
    await expect(error).toHaveText(ERROR_TEXT);
    await expect(error.getByRole('link', { name: 'contact@outcoretech.com' })).toHaveAttribute('href', 'mailto:contact@outcoretech.com');
    await expect(page.locator('.form-status')).toBeEmpty();
    await expect(page.getByLabel('Name', { exact: true })).toHaveValue(VISITOR.name);
    await expect(page.getByLabel('Message')).toHaveValue(VISITOR.message);
    await expect(page.locator('#contact-form button[type="submit"]')).toBeEnabled();
    await expect(page.locator('body')).not.toContainText('Invalid key');
    await expect(page.locator('body')).not.toContainText('Too many requests');
  });
}

test('a retry after a failure clears the error and confirms', async ({ page }) => {
  let calls = 0;
  await page.route(API, (route) => {
    calls += 1;
    return calls === 1 ? route.abort('failed') : route.fulfill(json(200, { success: true }));
  });
  await fillForm(page);
  const send = page.getByRole('button', { name: 'Send message' });
  await send.click();
  await expect(page.locator('.form-error')).not.toBeEmpty();
  await send.click();
  await expect(page.locator('.form-status')).toHaveText(SUCCESS_TEXT);
  await expect(page.locator('.form-error')).toBeEmpty();
});

test('an incomplete form sends nothing and focuses the first invalid field', async ({ page }) => {
  let calls = 0;
  await page.route(API, (route) => {
    calls += 1;
    return route.abort();
  });
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByLabel('Name', { exact: true })).toBeFocused();
  expect(calls).toBe(0);
});

test('a message shorter than 10 characters is rejected', async ({ page }) => {
  let calls = 0;
  await page.route(API, (route) => {
    calls += 1;
    return route.abort();
  });
  await fillForm(page, { ...VISITOR, message: '' });
  await page.getByLabel('Message').pressSequentially('too short');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByLabel('Message')).toBeFocused();
  expect(calls).toBe(0);
});

// Review Focus 1
test('double-clicking Send, Enter, or a second submit mid-flight sends exactly one request', async ({ page }) => {
  let calls = 0;
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  await page.route(API, async (route) => {
    calls += 1;
    await gate;
    await route.fulfill(json(200, { success: true }));
  });
  await fillForm(page);
  await page.locator('#contact-form button[type="submit"]').dblclick();
  await page.getByLabel('Name', { exact: true }).press('Enter');
  await page.locator('#contact-form').evaluate((form) => form.requestSubmit());
  release();
  await expect(page.locator('.form-status')).toHaveText(SUCCESS_TEXT);
  expect(calls).toBe(1);
});

// Review Focus 2
test('a request that never answers fails after 15 s and keeps the input', async ({ page }) => {
  await page.clock.install();
  await page.reload();
  await page.route(API, () => {}); // never fulfilled
  await fillForm(page);
  const button = page.locator('#contact-form button[type="submit"]');
  await button.click();
  await expect(button).toHaveText('Sending…');
  await page.clock.fastForward(15_000);
  await expect(page.locator('.form-error')).toHaveText(ERROR_TEXT);
  await expect(page.getByLabel('Message')).toHaveValue(VISITOR.message);
  await expect(button).toBeEnabled();
});

// Review Focus 3
test('non-ASCII input reaches the API byte-for-byte', async ({ page }) => {
  let body = null;
  await page.route(API, async (route) => {
    body = route.request().postDataJSON();
    await route.fulfill(json(200, { success: true }));
  });
  const visitor = {
    ...VISITOR,
    name: "José O'Brien",
    company: 'Müller & Søn',
    message: 'Sensors read 25 °C … 温度 🚀 — we need alerts.',
  };
  await fillForm(page, visitor);
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.locator('.form-status')).toHaveText(SUCCESS_TEXT);
  expect(body).toMatchObject({ name: visitor.name, company: visitor.company, message: visitor.message });
});
