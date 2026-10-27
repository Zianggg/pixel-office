import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildGrid, findPath, roomAt } from '../public/js/path.js';

const layout = JSON.parse(readFileSync(new URL('../public/layout.json', import.meta.url), 'utf8'));
const room = (id) => layout.rooms.find((r) => r.id === id);
const roomOf = (p) => roomAt(layout, p.x, p.y);

test('map is 36×20 with office, pantry and game rooms', () => {
  assert.equal(layout.cols, 36);
  assert.equal(layout.rows, 20);
  assert.equal(layout.tile, 32);
  assert.deepEqual(layout.rooms.map((r) => r.id), ['office', 'pantry', 'game']);
  assert.deepEqual(layout.dividers, [{ x: 24, y: 0, h: 20, doors: [5, 15] }]);
  const g = buildGrid(layout);
  assert.equal(g.length, 20);
  assert.equal(g[0].length, 36);
});

test('roomAt finds the room of a tile and null on the divider', () => {
  assert.equal(roomAt(layout, 3, 3).id, 'office');
  assert.equal(roomAt(layout, 30, 4).id, 'pantry');
  assert.equal(roomAt(layout, 30, 10).id, 'game');
  assert.equal(roomAt(layout, 24, 8), null);
  assert.equal(roomAt(layout, 40, 0), null);
});

test('walls of every room block; divider blocks except its doors', () => {
  const g = buildGrid(layout);
  for (const r of layout.rooms) {
    for (let y = r.y; y < r.y + r.wallRows; y++) {
      for (let x = r.x; x < r.x + r.w; x++) assert.equal(g[y][x], false, `wall ${x},${y} of ${r.id} is walkable`);
    }
  }
  for (const y of [3, 8, 12]) assert.equal(g[y][24], false, `divider 24,${y} is walkable`);
  assert.equal(g[5][24], true);
  assert.equal(g[15][24], true);
});

test('desks, props and furniture block; decals, seats and spots do not', () => {
  const g = buildGrid(layout);
  assert.equal(g[6][8], false, 'desk');
  assert.equal(g[7][8], true, 'chair');
  assert.equal(g[15][8], false, 'coffee table on the rug');
  assert.equal(g[14][7], true, 'rug is a decal');
  assert.equal(g[17][9], false, 'middle of the sofa');
  for (const s of layout.spots) assert.equal(g[s.y][s.x], true, `spot ${s.x},${s.y}`);
});

const WALL_HUNG = new Set(['window', 'windowWide', 'clock', 'painting', 'whiteboard', 'poster']);
const WALL_STANDING = new Set(['door', 'bookshelf', 'counter', 'fridge', 'arcade', 'tvStand']);

function clearOfSides(p, r) {
  assert.ok(p.x >= r.x + 1 && p.x + p.w <= r.x + r.w - 1, `${p.sprite} at ${p.x},${p.y} touches a side of ${r.id}`);
}

test("wall-hung props stay inside their room's wall band, clear of its sides", () => {
  for (const p of layout.props.filter((q) => WALL_HUNG.has(q.sprite))) {
    const r = roomOf(p);
    assert.ok(r, `${p.sprite} at ${p.x},${p.y} is in no room`);
    assert.ok(p.y >= r.y && p.y + p.h <= r.y + r.wallRows, `${p.sprite} at ${p.x},${p.y} leaves the wall of ${r.id}`);
    clearOfSides(p, r);
  }
});

test("wall-standing props stand on their room's wall base", () => {
  for (const p of layout.props.filter((q) => WALL_STANDING.has(q.sprite))) {
    const r = roomOf(p);
    assert.ok(r, `${p.sprite} at ${p.x},${p.y} is in no room`);
    assert.equal(p.y + p.h, r.y + r.wallRows, `${p.sprite} at ${p.x},${p.y} should stand on the wall base of ${r.id}`);
    clearOfSides(p, r);
  }
});

test("floor props keep one tile from their room's wall and sides", () => {
  for (const p of layout.props.filter((q) => !WALL_HUNG.has(q.sprite) && !WALL_STANDING.has(q.sprite))) {
    const r = roomOf(p);
    assert.ok(r, `${p.sprite} at ${p.x},${p.y} is in no room`);
    assert.ok(p.y >= r.y + r.wallRows + 1, `${p.sprite} at ${p.x},${p.y} touches the wall of ${r.id}`);
    assert.ok(p.y + p.h <= r.y + r.h - 1, `${p.sprite} at ${p.x},${p.y} touches the bottom of ${r.id}`);
    clearOfSides(p, r);
  }
});

test('desks and chairs keep clear of the office edges and of each other', () => {
  const r = room('office');
  const box = (d) => ({ x0: d.x, x1: d.x + d.w - 1, y0: d.y, y1: d.seat[1] });
  for (const d of layout.desks) {
    const b = box(d);
    assert.ok(b.x0 >= r.x + 2 && b.x1 <= r.x + r.w - 3, `desk at ${d.x},${d.y} too close to a side wall`);
    assert.ok(b.y0 >= r.y + r.wallRows + 1, `desk at ${d.x},${d.y} touches the back wall`);
    assert.ok(b.y1 <= r.y + r.h - 2, `chair of desk at ${d.x},${d.y} touches the bottom edge`);
  }
  layout.desks.forEach((a, i) => layout.desks.slice(i + 1).forEach((b) => {
    const [p, q] = [box(a), box(b)];
    const apart = p.x1 + 1 < q.x0 || q.x1 + 1 < p.x0 || p.y1 + 1 < q.y0 || q.y1 + 1 < p.y0;
    assert.ok(apart, `desks at ${a.x},${a.y} and ${b.x},${b.y} touch`);
  }));
});

test('spots are unique, inside their declared room, and never a desk seat', () => {
  const seats = new Set(layout.desks.map((d) => `${d.seat[0]},${d.seat[1]}`));
  const seen = new Set();
  for (const s of layout.spots) {
    const key = `${s.x},${s.y}`;
    assert.equal(roomAt(layout, s.x, s.y)?.id, s.room, `spot ${key} is not in ${s.room}`);
    assert.ok(!seen.has(key), `spot ${key} repeats`);
    assert.ok(!seats.has(key), `spot ${key} is a desk seat`);
    assert.ok(['up', 'down', 'left', 'right'].includes(s.face), `spot ${key} face ${s.face}`);
    assert.ok(['coffee', 'fridge', 'eat', 'arcade', 'pingpong', 'tv', 'sofa'].includes(s.act), `spot ${key} act ${s.act}`);
    seen.add(key);
  }
});

test('every seat, spot, wander point and the guest spot is reachable from spawn', () => {
  const g = buildGrid(layout);
  const targets = [...layout.desks.map((d) => d.seat), ...layout.spots.map((s) => [s.x, s.y]), ...layout.wander, layout.guest];
  for (const t of targets) assert.ok(findPath(g, layout.spawn, t), `unreachable ${t}`);
});

test('doorways connect both ways', () => {
  const g = buildGrid(layout);
  for (const y of [5, 15]) {
    assert.ok(findPath(g, [23, y], [25, y]), `office → right room at y${y}`);
    assert.ok(findPath(g, [25, y], [23, y]), `right room → office at y${y}`);
  }
});

test('a path from a tile that is now a wall returns null instead of hanging', () => {
  assert.equal(findPath(buildGrid(layout), [24, 8], [3, 7]), null);
});

test('shortest path avoids blocked cells', () => {
  const g = buildGrid(layout);
  const p = findPath(g, layout.spawn, [20, 7]);
  assert.deepEqual(p[0], [12, 3]);
  assert.deepEqual(p.at(-1), [20, 7]);
  assert.equal(p.length, 13);
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
