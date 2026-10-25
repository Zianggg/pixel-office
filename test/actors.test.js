import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildGrid } from '../public/js/path.js';
import { Actor, FRAMES, recolor } from '../public/js/actors.js';

const layout = JSON.parse(readFileSync(new URL('../public/layout.json', import.meta.url), 'utf8'));
const grid = buildGrid(layout);
const view = (o) => ({ key: 'unity-qa-tester', desk: 6, status: 'idle', instances: 0, ...o });
const runFor = (actor, ms, step = 50) => { for (let t = 0; t < ms; t += step) actor.update(step, () => 0.5); };

test('recolor swaps key colors and keeps alpha and other pixels', () => {
  const px = new Uint8ClampedArray([255, 0, 255, 255, 10, 20, 30, 128, 255, 0, 255, 0]);
  const out = recolor(px, { '#ff00ff': '#c03030' });
  assert.deepEqual([...out.slice(0, 4)], [0xc0, 0x30, 0x30, 255]);
  assert.deepEqual([...out.slice(4, 8)], [10, 20, 30, 128]);
  assert.deepEqual([...out.slice(8, 12)], [255, 0, 255, 0]);
  assert.deepEqual([...px.slice(0, 4)], [255, 0, 255, 255]);
});

test('a new actor stands at the spawn tile', () => {
  const a = new Actor(view(), layout, grid);
  assert.deepEqual(a.px, { x: layout.spawn[0] * 16, y: layout.spawn[1] * 16 });
  assert.equal(a.frame, FRAMES.down);
});

test('working actor walks to its seat and types', () => {
  const a = new Actor(view(), layout, grid);
  a.sync(view({ status: 'working' }), 0);
  runFor(a, 20000);
  const [sx, sy] = layout.desks[6].seat;
  assert.deepEqual(a.px, { x: sx * 16, y: sy * 16 });
  assert.ok([FRAMES.type1, FRAMES.type2].includes(a.frame));
  const seen = new Set();
  for (let i = 0; i < 8; i++) { a.update(125); seen.add(a.frame); }
  assert.deepEqual([...seen].sort(), [FRAMES.type1, FRAMES.type2].sort());
});

test('waiting actor sits still on type1', () => {
  const a = new Actor(view(), layout, grid);
  a.sync(view({ status: 'waiting' }), 0);
  runFor(a, 20000);
  for (let i = 0; i < 6; i++) { a.update(125); assert.equal(a.frame, FRAMES.type1); }
});

test('actor without a desk goes to the guest spot', () => {
  const a = new Actor(view({ desk: -1 }), layout, grid);
  a.sync(view({ desk: -1, status: 'working' }), 0);
  runFor(a, 20000);
  assert.deepEqual(a.px, { x: layout.guest[0] * 16, y: layout.guest[1] * 16 });
});

test('idle actor wanders to a wander point', () => {
  const a = new Actor(view(), layout, grid);
  runFor(a, 30000);
  const tiles = layout.wander.map(([x, y]) => `${x * 16},${y * 16}`);
  assert.ok(tiles.includes(`${a.px.x},${a.px.y}`), `at ${a.px.x},${a.px.y}`);
});

test('switching to work mid-walk still ends on the seat', () => {
  const a = new Actor(view(), layout, grid);
  runFor(a, 9000);
  a.update(170);
  a.sync(view({ status: 'working' }), 0);
  runFor(a, 20000);
  const [sx, sy] = layout.desks[6].seat;
  assert.deepEqual(a.px, { x: sx * 16, y: sy * 16 });
});

test('finished actor leaves the seat and wanders again', () => {
  const a = new Actor(view(), layout, grid);
  a.sync(view({ status: 'working' }), 0);
  runFor(a, 20000);
  a.sync(view({ status: 'done' }), 0);
  runFor(a, 30000);
  const [sx, sy] = layout.desks[6].seat;
  assert.notDeepEqual(a.px, { x: sx * 16, y: sy * 16 });
  assert.equal(a.frame === FRAMES.type1 || a.frame === FRAMES.type2, false);
});

test('walking left flips the side frames', () => {
  const a = new Actor(view({ desk: 9 }), layout, grid);
  a.sync(view({ desk: 9, status: 'working' }), 0);
  let flipped = false;
  for (let t = 0; t < 20000; t += 50) {
    a.update(50, () => 0.5);
    if (a.flip && [FRAMES.walkSide1, FRAMES.walkSide2].includes(a.frame)) flipped = true;
  }
  assert.ok(flipped);
});
