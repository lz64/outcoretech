import { test, expect } from '@playwright/test';
import { API, ACCESS_KEY, VISITOR, fillForm } from './helpers.js';

// With JS off, Chromium's smooth scrolling never settles for Playwright's click stability check,
// and spec §6 runs the no-JS form check at 375 px.
test.use({ javaScriptEnabled: false, reducedMotion: 'reduce', viewport: { width: 375, height: 800 } });

test('without JS the form POSTs natively and the confirmation appears', async ({ page, baseURL }) => {
  let posted = null;
  await page.route(API, async (route) => {
    posted = Object.fromEntries(new URLSearchParams(route.request().postData()));
    await route.fulfill({ status: 303, headers: { location: `${baseURL}/#message-sent` } });
  });
  await page.goto('/');
  await fillForm(page);
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.locator('#message-sent')).toBeVisible();
  expect(posted).toEqual({
    access_key: ACCESS_KEY,
    subject: 'New inquiry – Outcore Tech',
    from_name: 'Outcore Tech website',
    redirect: expect.stringMatching(/#message-sent$/),
    name: VISITOR.name,
    email: VISITOR.email,
    company: VISITOR.company,
    service: VISITOR.service,
    message: VISITOR.message,
  });
});

test('without JS an incomplete form is blocked by native validation', async ({ page }) => {
  let requests = 0;
  await page.route(API, (route) => {
    requests += 1;
    return route.abort();
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Send message' }).click();
  await page.waitForTimeout(500);
  expect(requests).toBe(0);
  await expect(page.locator('#message-sent')).toBeHidden();
});
