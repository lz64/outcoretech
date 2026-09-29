import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pngToIco } from './ico.mjs';

test('pngToIco wraps one PNG in a valid single-image ICO container', () => {
  const png = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');
  const ico = pngToIco(png, 32);
  assert.equal(ico.readUInt16LE(0), 0); // reserved
  assert.equal(ico.readUInt16LE(2), 1); // type: icon
  assert.equal(ico.readUInt16LE(4), 1); // image count
  assert.equal(ico.readUInt8(6), 32); // width
  assert.equal(ico.readUInt8(7), 32); // height
  assert.equal(ico.readUInt16LE(10), 1); // colour planes
  assert.equal(ico.readUInt16LE(12), 32); // bits per pixel
  assert.equal(ico.readUInt32LE(14), png.length); // image byte size
  assert.equal(ico.readUInt32LE(18), 22); // image offset
  assert.deepEqual(ico.subarray(22), png);
});

test('pngToIco encodes a 256 px image as 0 per the ICO format', () => {
  const ico = pngToIco(Buffer.alloc(8), 256);
  assert.equal(ico.readUInt8(6), 0);
  assert.equal(ico.readUInt8(7), 0);
});
