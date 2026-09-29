// DNS before/after checks for the outcoretech.com cutover (spec §5.4 Stage 2, §6 Stage 2).
// Only the web records may change; every mail record must be byte-identical afterwards.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { Resolver } from 'node:dns/promises';

export const DOMAIN = 'outcoretech.com';
export const QUERIES = [
  ['@', 'A'], ['@', 'AAAA'], ['@', 'MX'], ['@', 'TXT'], ['@', 'CAA'],
  ['www', 'CNAME'],
  ['_dmarc', 'TXT'], ['zmail._domainkey', 'TXT'], ['dc-8e814c8572._spfm', 'TXT'],
  ['_github-pages-challenge-lz64', 'TXT'], ['_domainconnect', 'CNAME'],
];
export const EXPECTED_AFTER = {
  '@ A': ['185.199.108.153', '185.199.109.153', '185.199.110.153', '185.199.111.153'],
  '@ AAAA': ['2606:50c0:8000::153', '2606:50c0:8001::153', '2606:50c0:8002::153', '2606:50c0:8003::153'],
  'www CNAME': ['lz64.github.io'],
};
const MAY_CHANGE = new Set(['@ A', '@ AAAA', 'www CNAME', '_github-pages-challenge-lz64 TXT']);

async function query(resolver, name, type) {
  try {
    switch (type) {
      case 'A': return (await resolver.resolve4(name)).sort();
      case 'AAAA': return (await resolver.resolve6(name)).sort();
      case 'MX': return (await resolver.resolveMx(name)).map((m) => `${m.priority} ${m.exchange}`).sort();
      case 'TXT': return (await resolver.resolveTxt(name)).map((chunks) => chunks.join('')).sort();
      case 'CAA': return (await resolver.resolveCaa(name)).map((c) => JSON.stringify(c)).sort();
      case 'CNAME': return (await resolver.resolveCname(name)).map((n) => n.toLowerCase()).sort();
      default: throw new Error(`unsupported type ${type}`);
    }
  } catch (error) {
    if (error.code === 'ENODATA' || error.code === 'ENOTFOUND') return [];
    throw error;
  }
}

export async function snapshot(servers = ['8.8.8.8', '1.1.1.1']) {
  const resolver = new Resolver();
  resolver.setServers(servers);
  const out = {};
  for (const [host, type] of QUERIES) {
    const name = host === '@' ? DOMAIN : `${host}.${DOMAIN}`;
    out[`${host} ${type}`] = await query(resolver, name, type);
  }
  return out;
}

const same = (a = [], b = []) => JSON.stringify(a) === JSON.stringify(b);

export function verifyCutover(before, after) {
  const problems = [];
  for (const key of Object.keys(before)) {
    if (MAY_CHANGE.has(key)) continue;
    if (!same(before[key], after[key])) {
      problems.push(`${key} changed: ${JSON.stringify(before[key])} -> ${JSON.stringify(after[key] ?? [])}`);
    }
  }
  for (const [key, want] of Object.entries(EXPECTED_AFTER)) {
    const got = after[key] ?? [];
    if (key === '@ AAAA' && got.length === 0) continue; // AAAA is recommended, not required
    if (!same([...want].sort(), got)) problems.push(`${key} is ${JSON.stringify(got)}, expected ${JSON.stringify(want)}`);
  }
  if ((after['_github-pages-challenge-lz64 TXT'] ?? []).length === 0) {
    problems.push('_github-pages-challenge-lz64 TXT is missing (it must stay permanently)');
  }
  return problems;
}

if (import.meta.main) {
  const [command, file] = process.argv.slice(2);
  if (command === 'snapshot' && file) {
    const snap = await snapshot();
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, `${JSON.stringify(snap, null, 2)}\n`);
    console.log(JSON.stringify(snap, null, 2));
    console.log(`Saved to ${file}`);
  } else if (command === 'verify' && file) {
    const problems = verifyCutover(JSON.parse(await readFile(file, 'utf8')), await snapshot());
    for (const problem of problems) console.log(`DNS ${problem}`);
    console.log(problems.length ? `${problems.length} DNS problem(s)` : 'Cutover DNS verified: web records correct, all other records unchanged');
    process.exitCode = problems.length ? 1 : 0;
  } else {
    console.error('Usage: node tools/dns.mjs snapshot <file> | verify <before-file>');
    process.exitCode = 2;
  }
}
