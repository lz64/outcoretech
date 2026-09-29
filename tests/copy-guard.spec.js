import { test, expect } from '@playwright/test';

// Claims the review removed or that Ari never made (spec §8). None may reappear in page text.
const FORBIDDEN = [
  'data pipeline', 'operator', 'security', 'hardened', 'testimonial', 'clients include',
  'certified', 'award', 'guarantee', '24/7', 'years of experience with',
];

test('no unsupported claims appear anywhere in the page text', async ({ page }) => {
  await page.goto('/');
  const text = (await page.locator('body').innerText()).toLowerCase();
  for (const phrase of FORBIDDEN) expect(text, `found "${phrase}"`).not.toContain(phrase);
});
