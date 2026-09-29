// Enforces the colour contract in spec §4.1 by reading the tokens straight from site.css.
import { readFile } from 'node:fs/promises';

const TOKEN = /--([a-z0-9-]+)\s*:\s*(#[0-9a-f]{6})\b/gi;
const LIGHT_BLOCK = /:root\s*\{([^}]*)\}/;
const DARK_BLOCK = /@media\s*\(\s*prefers-color-scheme\s*:\s*dark\s*\)\s*\{\s*:root\s*\{([^}]*)\}/;

export const CONTRACT = [
  { fg: ['text', 'muted', 'accent-text', 'danger'], bg: ['bg', 'surface', 'surface-2'], min: 4.5 },
  { fg: ['on-accent'], bg: ['accent'], min: 4.5 },
  { fg: ['field-border', 'focus'], bg: ['bg', 'surface', 'surface-2'], min: 3 },
];

function channel(value) {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const n = Number.parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
}

function tokens(block) {
  return Object.fromEntries([...block.matchAll(TOKEN)].map((m) => [m[1], m[2].toLowerCase()]));
}

export function parseThemes(css) {
  const light = tokens(css.match(LIGHT_BLOCK)?.[1] ?? '');
  const dark = { ...light, ...tokens(css.match(DARK_BLOCK)?.[1] ?? '') };
  return { light, dark };
}

export function checkContract(themes, contract = CONTRACT) {
  const results = [];
  for (const [theme, t] of Object.entries(themes)) {
    for (const rule of contract) {
      for (const fg of rule.fg) {
        for (const bg of rule.bg) {
          const ratio = t[fg] && t[bg] ? contrastRatio(t[fg], t[bg]) : Number.NaN;
          results.push({ theme, fg, bg, ratio, min: rule.min, pass: ratio >= rule.min });
        }
      }
    }
  }
  return results;
}

if (import.meta.main) {
  const file = process.argv[2] ?? 'site/assets/css/site.css';
  const results = checkContract(parseThemes(await readFile(file, 'utf8')));
  for (const r of results) {
    console.log(`${r.pass ? 'ok  ' : 'FAIL'} ${r.theme.padEnd(5)} --${r.fg} on --${r.bg}: ${r.ratio} (min ${r.min})`);
  }
  const failed = results.filter((r) => !r.pass).length;
  console.log(failed ? `${failed} contrast failure(s)` : 'Contrast contract met');
  process.exitCode = failed ? 1 : 0;
}
