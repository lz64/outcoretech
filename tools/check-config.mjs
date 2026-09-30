// Guards the contact form's deploy-critical fields (spec §5.3): a real Web3Forms key,
// an allowed same-domain redirect, no replyto override, and an input named exactly "email".
import { readFile } from 'node:fs/promises';

export const PLACEHOLDER_KEY = '00000000-0000-0000-0000-000000000000';
// The lz64.github.io preview redirect was retired at Stage 2: Web3Forms' free plan refuses
// cross-domain redirects, so a stale preview value would silently break the no-JS confirmation.
export const ALLOWED_REDIRECTS = ['https://outcoretech.com/#message-sent'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function inputValue(html, name) {
  const tag = html.match(new RegExp(`<input\\b[^>]*\\bname="${name}"[^>]*>`));
  if (!tag) return null;
  return tag[0].match(/\bvalue="([^"]*)"/)?.[1] ?? null;
}

export function checkFormConfig(html, { requireLiveKey = false } = {}) {
  const problems = [];
  const key = inputValue(html, 'access_key');
  if (!key || !UUID.test(key)) {
    problems.push(`access_key must be a UUID, found ${JSON.stringify(key)}`);
  } else if (requireLiveKey && key === PLACEHOLDER_KEY) {
    problems.push('access_key is the placeholder; set the real Web3Forms key');
  }
  const redirect = inputValue(html, 'redirect');
  if (!ALLOWED_REDIRECTS.includes(redirect)) {
    problems.push(`redirect must be one of ${ALLOWED_REDIRECTS.join(' | ')}, found ${JSON.stringify(redirect)}`);
  }
  if (/\bname="replyto"/i.test(html)) {
    problems.push('remove the replyto field: Web3Forms uses the email field as Reply-To');
  }
  if (!/<input\b[^>]*\bname="email"/.test(html)) {
    problems.push('the email input must be named exactly "email"');
  }
  return problems;
}

if (import.meta.main) {
  const html = await readFile('site/index.html', 'utf8');
  const problems = checkFormConfig(html, { requireLiveKey: process.argv.includes('--require-live-key') });
  for (const problem of problems) console.log(`FORM CONFIG ${problem}`);
  console.log(problems.length ? `${problems.length} form config problem(s)` : 'Form config OK');
  process.exitCode = problems.length ? 1 : 0;
}
