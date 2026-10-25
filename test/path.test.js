import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildGrid, findPath } from '../public/js/path.js';

const layout = JSON.parse(readFileSync(new URL('../public/layout.json', import.meta.url), 'utf8'));

test('grid blocks walls, desks and floor props but not seats', () => {
  const g = buildGrid(layout);
  assert.equal(layout.tile, 32);
  assert.equal(layout.wallRows, 3);
  assert.equal(g.length, 16);
  assert.equal(g[0].length, 26);
  for (let y = 0; y < 3; y++) assert.equal(g[y][12], false);
  assert.equal(g[3][12], true);
  assert.equal(g[5][8], false);
  assert.equal(g[5][9], false);
  assert.equal(g[6][8], true);
  assert.equal(g[5][2], false);
  assert.equal(g[5][4], false);
  assert.equal(g[4][23], false);
  assert.equal(g[5][23], false);
  assert.equal(g[14][23], false);
  assert.equal(g[6][6], false);
  assert.equal(g[10][12], false);
});

const WALL_HUNG = new Set(['window', 'clock', 'painting', 'whiteboard']);
const WALL_STANDING = new Set(['door', 'bookshelf']);

test('wall-hung props sit inside the wall, clear of the room sides', () => {
  for (const p of layout.props.filter((q) => WALL_HUNG.has(q.sprite))) {
    assert.ok(p.y >= 0 && p.y + p.h <= layout.wallRows, `${p.sprite} at ${p.x},${p.y} leaves the wall`);
    assert.ok(p.x >= 1 && p.x + p.w <= layout.cols - 1, `${p.sprite} at ${p.x},${p.y} touches a side`);
  }
});

test('door and bookshelves stand on the wall base; floor props keep a gap from walls and sides', () => {
  for (const p of layout.props) {
    if (WALL_HUNG.has(p.sprite)) continue;
    if (WALL_STANDING.has(p.sprite)) {
      assert.equal(p.y + p.h, layout.wallRows, `${p.sprite} at ${p.x},${p.y} should stand on the wall base`);
      continue;
    }
    assert.ok(p.y >= layout.wallRows + 1, `${p.sprite} at ${p.x},${p.y} touches the wall`);
    assert.ok(p.y + p.h <= layout.rows - 1, `${p.sprite} at ${p.x},${p.y} touches the bottom edge`);
    assert.ok(p.x >= 1 && p.x + p.w <= layout.cols - 1, `${p.sprite} at ${p.x},${p.y} touches a side`);
  }
});

test('desks and chairs keep clear of the room edges and of each other', () => {
  const box = (d) => ({ x0: d.x, x1: d.x + d.w - 1, y0: d.y, y1: d.seat[1] });
  for (const d of layout.desks) {
    const b = box(d);
    assert.ok(b.x0 >= 2 && b.x1 <= layout.cols - 3, `desk at ${d.x},${d.y} too close to a side wall`);
    assert.ok(b.y0 >= layout.wallRows + 1, `desk at ${d.x},${d.y} touches the back wall`);
    assert.ok(b.y1 <= layout.rows - 2, `chair of desk at ${d.x},${d.y} touches the bottom edge`);
  }
  layout.desks.forEach((a, i) => layout.desks.slice(i + 1).forEach((b) => {
    const [p, q] = [box(a), box(b)];
    const apart = p.x1 + 1 < q.x0 || q.x1 + 1 < p.x0 || p.y1 + 1 < q.y0 || q.y1 + 1 < p.y0;
    assert.ok(apart, `desks at ${a.x},${a.y} and ${b.x},${b.y} touch`);
  }));
});

test('every seat, wander point, spawn and guest spot is reachable from spawn', () => {
  const g = buildGrid(layout);
  const targets = [...layout.desks.map((d) => d.seat), ...layout.wander, layout.guest];
  for (const t of targets) assert.ok(findPath(g, layout.spawn, t), `unreachable ${t}`);
});

test('shortest path avoids blocked cells', () => {
  const g = buildGrid(layout);
  const p = findPath(g, layout.spawn, [20, 6]);
  assert.deepEqual(p[0], [12, 3]);
  assert.deepEqual(p.at(-1), [20, 6]);
  assert.equal(p.length, 12);
  for (const [x, y] of p) assert.ok(g[y][x], `blocked ${x},${y}`);
  for (let i = 1; i < p.length; i++) {
    assert.equal(Math.abs(p[i][0] - p[i - 1][0]) + Math.abs(p[i][1] - p[i - 1][1]), 1);
  }
});

test('same start and end returns a single cell', () => {
  assert.deepEqual(findPath(buildGrid(layout), [12, 3], [12, 3]), [[12, 3]]);
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
