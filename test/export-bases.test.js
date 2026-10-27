import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AREAS, inkscapeArgs } from '../art-src/export-bases.mjs';

test('AREAS follow the concept sheet layout on the 8:1 grid', () => {
  assert.deepEqual(AREAS, { stand: [0, 0, 256, 512, 32, 64], back: [256, 0, 512, 512, 32, 64], sit: [512, 0, 1024, 512, 64, 64] });
});

test('inkscapeArgs exports one view at pixel size without antialiasing', () => {
  const args = inkscapeArgs('a.svg', 'sit', 'o.png');
  for (const a of ['a.svg', '--export-area=512:0:1024:512', '--export-width=64', '--export-height=64', '--export-png-antialias=0', '-o', 'o.png']) {
    assert.ok(args.includes(a), `missing ${a} in ${args.join(' ')}`);
  }
  assert.equal(args[args.indexOf('-o') + 1], 'o.png');
});

test('inkscapeArgs refuses an unknown view', () => {
  assert.throws(() => inkscapeArgs('a.svg', 'side', 'o.png'), /side/);
});
