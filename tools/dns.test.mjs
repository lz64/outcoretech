import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verifyCutover } from './dns.mjs';

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
