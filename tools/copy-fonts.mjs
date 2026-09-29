// Copies the Latin-subset IBM Plex woff2 files (and their licence) from npm into site/.
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';

const OUT = 'site/assets/fonts';
const SANS = 'node_modules/@fontsource-variable/ibm-plex-sans';
const MONO = 'node_modules/@fontsource/ibm-plex-mono';

await mkdir(OUT, { recursive: true });
await copyFile(`${SANS}/files/ibm-plex-sans-latin-wght-normal.woff2`, `${OUT}/ibm-plex-sans-latin-var.woff2`);
await copyFile(`${MONO}/files/ibm-plex-mono-latin-400-normal.woff2`, `${OUT}/ibm-plex-mono-latin-400.woff2`);
await copyFile(`${MONO}/files/ibm-plex-mono-latin-500-normal.woff2`, `${OUT}/ibm-plex-mono-latin-500.woff2`);
const sans = await readFile(`${SANS}/LICENSE`, 'utf8');
const mono = await readFile(`${MONO}/LICENSE`, 'utf8');
await writeFile(`${OUT}/OFL.txt`, `IBM Plex Sans\n=============\n\n${sans}\n\nIBM Plex Mono\n=============\n\n${mono}`);
console.log(`Fonts and OFL.txt written to ${OUT}`);
