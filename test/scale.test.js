import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fitScale } from '../public/js/scale.js';

test('I4: a maximised 1920x1080 browser shows the 832x512 room larger than x1', () => {
  assert.equal(fitScale(1920, 969 - 37 - 16, 832, 512), 1.5);
});

test('fitScale steps by 0.5 and never goes below 1', () => {
  assert.equal(fitScale(1280, 720, 832, 512), 1);
  assert.equal(fitScale(700, 400, 832, 512), 1);
  assert.equal(fitScale(2560, 1400, 832, 512), 2.5);
  assert.equal(fitScale(1700, 1100, 832, 512), 2);
});
