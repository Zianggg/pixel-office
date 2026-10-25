import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wrapText } from '../public/js/overlay.js';

const ctx = { measureText: (s) => ({ width: Array.from(s).length * 10 }) };

test('short text stays on one line', () => {
  assert.deepEqual(wrapText(ctx, 'Sửa Player.cs', 200, 2), ['Sửa Player.cs']);
});

test('wraps on spaces', () => {
  assert.deepEqual(wrapText(ctx, 'Giao việc cho unity-qa-tester', 150, 2), ['Giao việc cho', 'unity-qa-tester']);
});

test('caps lines and ends with an ellipsis', () => {
  const lines = wrapText(ctx, 'một hai ba bốn năm sáu bảy tám chín mười', 80, 2);
  assert.equal(lines.length, 2);
  assert.ok(lines[1].endsWith('…'));
  assert.ok(ctx.measureText(lines[1]).width <= 80);
});

test('breaks a word longer than the line', () => {
  const lines = wrapText(ctx, 'PlayerControllerTests.cs', 100, 2);
  assert.equal(lines[0], 'PlayerCont');
  assert.ok(lines.every((l) => ctx.measureText(l).width <= 100));
});
