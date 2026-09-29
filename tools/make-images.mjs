// Renders the raster brand assets from tools/brand/*.html with headless Chromium.
// Re-run after changing the logo, the headline, or the fonts: npm run images
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { createSiteServer } from './serve.mjs';
import { pngToIco } from './ico.mjs';

const OUT = 'site/assets/img';
await mkdir(OUT, { recursive: true });

// Serve the repo root over http so the brand pages can load site/assets/fonts
// (Chromium blocks font loads from file:// pages).
const server = createSiteServer('.');
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}/tools/brand/`;
const browser = await chromium.launch();

async function render(page, file, width, height, fonts = []) {
  await page.setViewportSize({ width, height });
  await page.goto(base + file);
  const missing = await page.evaluate(async (wanted) => {
    await document.fonts.ready;
    return wanted.filter((font) => !document.fonts.check(font));
  }, fonts);
  if (missing.length) throw new Error(`${file}: fonts not loaded: ${missing.join(', ')}`);
  return page.screenshot({ type: 'png' });
}

try {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  const og = await render(page, 'og-image.html', 1200, 630, ['600 60px "IBM Plex Sans"', '500 17px "IBM Plex Mono"']);
  await writeFile(`${OUT}/og-image.png`, og);
  await writeFile(`${OUT}/apple-touch-icon.png`, await render(page, 'icon.html', 180, 180));
  await writeFile(`${OUT}/favicon.ico`, pngToIco(await render(page, 'icon.html', 32, 32), 32));
  console.log(`Wrote og-image.png, apple-touch-icon.png and favicon.ico to ${OUT}`);
} finally {
  await browser.close();
  server.closeAllConnections();
  server.close();
}
