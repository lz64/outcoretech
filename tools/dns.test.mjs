import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DOMAIN, QUERIES, verifyCutover, snapshot } from './dns.mjs';

const BEFORE = {
  '@ A': ['15.197.148.33', '3.33.130.190'],
  '@ AAAA': [],
  '@ MX': ['10 mx.zoho.com', '20 mx3.zoho.com', '50 mx2.zoho.com'],
  '@ TXT': ['v=spf1 include:dc-8e814c8572._spfm.outcoretech.com ~all'],
  '@ CAA': [],
  'www CNAME': ['outcoretech.com'],
  '_dmarc TXT': [],
  'zmail._domainkey TXT': ['v=DKIM1; k=rsa; p=MIGf'],
  'dc-8e814c8572._spfm TXT': ['v=spf1 include:zoho.com ~all'],
  '_github-pages-challenge-lz64 TXT': [],
  '_domainconnect CNAME': ['_domainconnect.gd.domaincontrol.com'],
};

const GOOD_AFTER = {
  ...BEFORE,
  '@ A': ['185.199.108.153', '185.199.109.153', '185.199.110.153', '185.199.111.153'],
  '@ AAAA': ['2606:50c0:8000::153', '2606:50c0:8001::153', '2606:50c0:8002::153', '2606:50c0:8003::153'],
  'www CNAME': ['lz64.github.io'],
  '_github-pages-challenge-lz64 TXT': ['0123456789abcdef'],
};

test('a correct cutover passes', () => {
  assert.deepEqual(verifyCutover(BEFORE, GOOD_AFTER), []);
});

test('AAAA records are optional', () => {
  assert.deepEqual(verifyCutover(BEFORE, { ...GOOD_AFTER, '@ AAAA': [] }), []);
});

test('a leftover parking A record fails', () => {
  const after = { ...GOOD_AFTER, '@ A': [...GOOD_AFTER['@ A'], '15.197.148.33'].sort() };
  assert.equal(verifyCutover(BEFORE, after).length, 1);
});

test('a changed MX record fails', () => {
  assert.equal(verifyCutover(BEFORE, { ...GOOD_AFTER, '@ MX': ['10 mx.zoho.com'] }).length, 1);
});

test('a deleted DKIM record fails', () => {
  assert.equal(verifyCutover(BEFORE, { ...GOOD_AFTER, 'zmail._domainkey TXT': [] }).length, 1);
});

test('a www record that does not point at lz64.github.io fails', () => {
  assert.equal(verifyCutover(BEFORE, { ...GOOD_AFTER, 'www CNAME': ['outcoretech.com'] }).length, 1);
});

test('a missing GitHub verification TXT record fails', () => {
  assert.equal(verifyCutover(BEFORE, { ...GOOD_AFTER, '_github-pages-challenge-lz64 TXT': [] }).length, 1);
});

// Finding F5: GitHub Pages can only provision HTTPS if the zone's CAA record (when present) authorizes Let's Encrypt.
test('an empty CAA record needs no CA authorization', () => {
  assert.deepEqual(verifyCutover(BEFORE, GOOD_AFTER), []);
});

test('a CAA record that authorizes only another CA fails', () => {
  const caa = ['{"critical":0,"issue":"digicert.com"}'];
  const before = { ...BEFORE, '@ CAA': caa };
  const after = { ...GOOD_AFTER, '@ CAA': caa };
  assert.equal(verifyCutover(before, after).length, 1);
});

test('a CAA record that authorizes letsencrypt.org passes', () => {
  const caa = ['{"critical":0,"issue":"letsencrypt.org"}'];
  const before = { ...BEFORE, '@ CAA': caa };
  const after = { ...GOOD_AFTER, '@ CAA': caa };
  assert.deepEqual(verifyCutover(before, after), []);
});

test('a CAA record that authorizes letsencrypt.org only for wildcards passes', () => {
  const caa = ['{"critical":0,"issuewild":"letsencrypt.org"}'];
  const before = { ...BEFORE, '@ CAA': caa };
  const after = { ...GOOD_AFTER, '@ CAA': caa };
  assert.deepEqual(verifyCutover(before, after), []);
});

// Finding F1: snapshot() must accept an injectable resolver so it can be unit tested without
// touching the network, and must normalize each record type the same way regardless of resolver.
function notFoundStub() {
  const error = new Error('queryA ENOTFOUND');
  error.code = 'ENOTFOUND';
  return Promise.reject(error);
}

test('snapshot() returns every configured key, normalized per record type', async () => {
  const txtByName = {
    [DOMAIN]: [['v=spf1 include:dc-8e814c8572._spfm.outcoretech.com ~all']],
    [`zmail._domainkey.${DOMAIN}`]: [['v=DKIM1; k=rsa; ', 'p=ABCDEF']],
    [`dc-8e814c8572._spfm.${DOMAIN}`]: [['v=spf1 include:zoho.com ~all']],
  };
  const stub = {
    resolve4: (name) => (name === DOMAIN ? Promise.resolve(['3.33.130.190', '15.197.148.33'].reverse()) : notFoundStub()),
    resolve6: () => notFoundStub(),
    resolveMx: (name) =>
      name === DOMAIN
        ? Promise.resolve([
            { priority: 20, exchange: 'mx3.zoho.com' },
            { priority: 10, exchange: 'mx.zoho.com' },
            { priority: 50, exchange: 'mx2.zoho.com' },
          ])
        : notFoundStub(),
    resolveTxt: (name) => (txtByName[name] ? Promise.resolve(txtByName[name]) : notFoundStub()),
    resolveCaa: (name) => (name === DOMAIN ? Promise.resolve([{ critical: 0, issue: 'letsencrypt.org' }]) : notFoundStub()),
    resolveCname: (name) => (name === `www.${DOMAIN}` ? Promise.resolve(['LZ64.GITHUB.IO']) : notFoundStub()),
  };

  const snap = await snapshot({ resolver: stub });

  assert.deepEqual(Object.keys(snap).sort(), QUERIES.map(([host, type]) => `${host} ${type}`).sort());
  assert.deepEqual(snap['@ A'], ['15.197.148.33', '3.33.130.190']); // sorted
  assert.deepEqual(snap['@ AAAA'], []); // no resolve6 records -> []
  assert.deepEqual(snap['@ MX'], ['10 mx.zoho.com', '20 mx3.zoho.com', '50 mx2.zoho.com']); // "priority exchange", sorted
  assert.deepEqual(snap['@ TXT'], ['v=spf1 include:dc-8e814c8572._spfm.outcoretech.com ~all']);
  assert.deepEqual(snap['@ CAA'], [JSON.stringify({ critical: 0, issue: 'letsencrypt.org' })]);
  assert.deepEqual(snap['www CNAME'], ['lz64.github.io']); // lowercased
  assert.deepEqual(snap['zmail._domainkey TXT'], ['v=DKIM1; k=rsa; p=ABCDEF']); // chunks joined
  assert.deepEqual(snap['dc-8e814c8572._spfm TXT'], ['v=spf1 include:zoho.com ~all']);
  assert.deepEqual(snap['_dmarc TXT'], []);
  assert.deepEqual(snap['_github-pages-challenge-lz64 TXT'], []);
  assert.deepEqual(snap['_domainconnect CNAME'], []);
});

test('snapshot() treats ENODATA the same as ENOTFOUND (empty array, not a throw)', async () => {
  const enodata = () => {
    const error = new Error('queryTxt ENODATA');
    error.code = 'ENODATA';
    return Promise.reject(error);
  };
  const stub = { resolve4: enodata, resolve6: enodata, resolveMx: enodata, resolveTxt: enodata, resolveCaa: enodata, resolveCname: enodata };

  const snap = await snapshot({ resolver: stub });

  assert.equal(Object.values(snap).every((value) => Array.isArray(value) && value.length === 0), true);
});

test('snapshot() rejects on an error other than ENODATA/ENOTFOUND', async () => {
  const timeout = () => {
    const error = new Error('queryA ETIMEOUT');
    error.code = 'ETIMEOUT';
    return Promise.reject(error);
  };
  const stub = { resolve4: timeout, resolve6: timeout, resolveMx: timeout, resolveTxt: timeout, resolveCaa: timeout, resolveCname: timeout };

  await assert.rejects(() => snapshot({ resolver: stub }), /ETIMEOUT/);
});
