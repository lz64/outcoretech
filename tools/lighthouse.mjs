// Runs Lighthouse (mobile, default throttling) N times; every category's median must be >= 0.95.
// Usage: node tools/lighthouse.mjs <url> [runs=3]
import { writeFile } from 'node:fs/promises';
import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';
import { chromium } from '@playwright/test';

const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'];
const url = process.argv[2];
const runs = Number(process.argv[3] ?? 3);
if (!url) {
  console.error('Usage: node tools/lighthouse.mjs <url> [runs=3]');
  process.exit(2);
}

const scores = Object.fromEntries(CATEGORIES.map((c) => [c, []]));
for (let i = 1; i <= runs; i += 1) {
  const chrome = await launch({ chromePath: chromium.executablePath(), chromeFlags: ['--headless=new'] });
  try {
    const result = await lighthouse(url, {
      port: chrome.port,
      output: 'json',
      onlyCategories: CATEGORIES,
      logLevel: 'error',
    });
    for (const c of CATEGORIES) scores[c].push(result.lhr.categories[c].score);
    console.log(`run ${i}: ${CATEGORIES.map((c) => `${c} ${Math.round(result.lhr.categories[c].score * 100)}`).join(', ')}`);
    if (i === runs) {
      await writeFile(`lighthouse-${new URL(url).host.replace(/[^a-z0-9.-]/gi, '_')}.json`, result.report);
    }
  } finally {
    await chrome.kill();
  }
}

const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
let failed = 0;
for (const c of CATEGORIES) {
  const m = median(scores[c]);
  if (m < 0.95) failed += 1;
  console.log(`${m >= 0.95 ? 'ok  ' : 'FAIL'} ${c}: median ${Math.round(m * 100)}`);
}
process.exitCode = failed ? 1 : 0;
