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

// Public DNS resolvers (8.8.8.8, 1.1.1.1, ...) cache answers, so a change can still read as
// "unchanged" from a resolver that warmed its cache during the before-snapshot. Querying the
// zone's own authoritative nameservers avoids that: they are always current.
export async function authoritativeServers(domain = DOMAIN, bootstrap = ['8.8.8.8', '1.1.1.1']) {
  const bootstrapResolver = new Resolver();
  bootstrapResolver.setServers(bootstrap);
  const nsHosts = await bootstrapResolver.resolveNs(domain);
  const ips = new Set();
  for (const host of nsHosts) {
    try {
      for (const ip of await bootstrapResolver.resolve4(host)) ips.add(ip);
    } catch {
      // Skip a nameserver host that doesn't resolve; another one may still work.
    }
  }
  if (ips.size === 0) {
    throw new Error(`Could not resolve any authoritative nameserver IPs for ${domain} (nameservers: ${nsHosts.join(', ') || 'none found'})`);
  }
  return [...ips].sort();
}

export async function snapshot({ resolver } = {}) {
  let activeResolver = resolver;
  if (!activeResolver) {
    activeResolver = new Resolver();
    activeResolver.setServers(await authoritativeServers());
  }
  const out = {};
  for (const [host, type] of QUERIES) {
    const name = host === '@' ? DOMAIN : `${host}.${DOMAIN}`;
    out[`${host} ${type}`] = await query(activeResolver, name, type);
  }
  return out;
}

const same = (a = [], b = []) => JSON.stringify(a) === JSON.stringify(b);

// CAA entries are JSON.stringify of Node's resolveCaa objects, e.g. {"critical":0,"issue":"letsencrypt.org"}.
function allowsLetsEncrypt(caaEntries) {
  return caaEntries.some((entry) => {
    let parsed;
    try {
      parsed = JSON.parse(entry);
    } catch {
      return false;
    }
    return parsed.issue === 'letsencrypt.org' || parsed.issuewild === 'letsencrypt.org';
  });
}

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
  const caa = after['@ CAA'] ?? [];
  if (caa.length > 0 && !allowsLetsEncrypt(caa)) {
    problems.push('@ CAA does not allow letsencrypt.org, so GitHub Pages cannot issue the HTTPS certificate');
  }
  return problems;
}

async function queryingResolver() {
  const ips = await authoritativeServers();
  console.log(`Queried authoritative nameservers: ${ips.join(', ')}`);
  const resolver = new Resolver();
  resolver.setServers(ips);
  return resolver;
}

if (import.meta.main) {
  const [command, file] = process.argv.slice(2);
  if (command === 'snapshot' && file) {
    const snap = await snapshot({ resolver: await queryingResolver() });
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, `${JSON.stringify(snap, null, 2)}\n`);
    console.log(JSON.stringify(snap, null, 2));
    console.log(`Saved to ${file}`);
  } else if (command === 'verify' && file) {
    const before = JSON.parse(await readFile(file, 'utf8'));
    const problems = verifyCutover(before, await snapshot({ resolver: await queryingResolver() }));
    for (const problem of problems) console.log(`DNS ${problem}`);
    console.log(problems.length ? `${problems.length} DNS problem(s)` : 'Cutover DNS verified: web records correct, all other records unchanged');
    process.exitCode = problems.length ? 1 : 0;
  } else {
    console.error('Usage: node tools/dns.mjs snapshot <file> | verify <before-file>');
    process.exitCode = 2;
  }
}
