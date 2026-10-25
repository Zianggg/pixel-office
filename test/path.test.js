import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildGrid, findPath } from '../public/js/path.js';

const layout = JSON.parse(readFileSync(new URL('../public/layout.json', import.meta.url), 'utf8'));

test('grid blocks walls, desks and floor props but not seats', () => {
  const g = buildGrid(layout);
  assert.equal(g.length, 11);
  assert.equal(g[0].length, 20);
  assert.equal(g[0][9], false);
  assert.equal(g[1][3], false);
  assert.equal(g[2][9], true);
  assert.equal(g[4][6], false);
  assert.equal(g[4][7], false);
  assert.equal(g[5][6], true);
  assert.equal(g[3][1], false);
  assert.equal(g[3][3], false);
  assert.equal(g[2][18], false);
  assert.equal(g[3][18], false);
  assert.equal(g[10][18], false);
  assert.equal(g[4][4], false);
});

test('every seat, wander point, spawn and guest spot is reachable from spawn', () => {
  const g = buildGrid(layout);
  const targets = [...layout.desks.map((d) => d.seat), ...layout.wander, layout.guest];
  for (const t of targets) assert.ok(findPath(g, layout.spawn, t), `unreachable ${t}`);
});

test('shortest path avoids blocked cells', () => {
  const g = buildGrid(layout);
  const p = findPath(g, [9, 2], [15, 5]);
  assert.deepEqual(p[0], [9, 2]);
  assert.deepEqual(p.at(-1), [15, 5]);
  assert.equal(p.length, 10);
  for (const [x, y] of p) assert.ok(g[y][x], `blocked ${x},${y}`);
  for (let i = 1; i < p.length; i++) {
    assert.equal(Math.abs(p[i][0] - p[i - 1][0]) + Math.abs(p[i][1] - p[i - 1][1]), 1);
  }
});

test('same start and end returns a single cell', () => {
  assert.deepEqual(findPath(buildGrid(layout), [9, 2], [9, 2]), [[9, 2]]);
});

test('enclosed or out-of-bounds targets return null', () => {
  const g = [
    [true, true, true],
    [true, false, false],
    [true, false, true],
  ];
  assert.equal(findPath(g, [0, 0], [2, 2]), null);
  assert.equal(findPath(g, [0, 0], [5, 5]), null);
});
