import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fitScale } from '../public/js/scale.js';

test('I4: a maximised 1920x1080 browser shows the 832x512 room larger than x1', () => {
  assert.equal(fitScale(1920, 969 - 37 - 16, 832, 512), 1.5);
});

test('fitScale steps by 0.5 once the room fits at x1', () => {
  assert.equal(fitScale(1280, 720, 832, 512), 1);
  assert.equal(fitScale(2560, 1400, 832, 512), 2.5);
  assert.equal(fitScale(1700, 1100, 832, 512), 2);
});

test('a window narrower than the room shrinks it to fit instead of squashing it', () => {
  assert.equal(fitScale(1008, 700, 1152, 640), 1008 / 1152);
  assert.equal(fitScale(700, 400, 832, 512), 400 / 512);
});

test('the 1152x640 multi-room map shows at x1 in a maximised 1080p browser', () => {
  assert.equal(fitScale(1920, 969 - 37 - 16, 1152, 640), 1);
});
