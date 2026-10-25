import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildGrid } from '../public/js/path.js';
import { Actor, FRAMES, accFrame, recolor, spriteBox, agentColorMap } from '../public/js/actors.js';
import { charMeta } from '../public/js/sprites.js';

const layout = JSON.parse(readFileSync(new URL('../public/layout.json', import.meta.url), 'utf8'));
const grid = buildGrid(layout);
const T = layout.tile;
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
  assert.deepEqual(a.px, { x: layout.spawn[0] * T, y: layout.spawn[1] * T });
  assert.equal(a.frame, FRAMES.down);
});

test('working actor walks to its seat and types', () => {
  const a = new Actor(view(), layout, grid);
  a.sync(view({ status: 'working' }), 0);
  runFor(a, 20000);
  const [sx, sy] = layout.desks[6].seat;
  assert.deepEqual(a.px, { x: sx * T, y: sy * T });
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
  assert.deepEqual(a.px, { x: layout.guest[0] * T, y: layout.guest[1] * T });
});

test('idle actor wanders to a wander point', () => {
  const a = new Actor(view(), layout, grid);
  runFor(a, 30000);
  const tiles = layout.wander.map(([x, y]) => `${x * T},${y * T}`);
  assert.ok(tiles.includes(`${a.px.x},${a.px.y}`), `at ${a.px.x},${a.px.y}`);
});

test('switching to work mid-walk still ends on the seat', () => {
  const a = new Actor(view(), layout, grid);
  runFor(a, 9000);
  a.update(170);
  a.sync(view({ status: 'working' }), 0);
  runFor(a, 20000);
  const [sx, sy] = layout.desks[6].seat;
  assert.deepEqual(a.px, { x: sx * T, y: sy * T });
});

test('finished actor leaves the seat and wanders again', () => {
  const a = new Actor(view(), layout, grid);
  a.sync(view({ status: 'working' }), 0);
  runFor(a, 20000);
  a.sync(view({ status: 'done' }), 0);
  runFor(a, 30000);
  const [sx, sy] = layout.desks[6].seat;
  assert.notDeepEqual(a.px, { x: sx * T, y: sy * T });
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

test('accFrame picks the accessory view (front/back/side) for each character frame', () => {
  const want = { down: 0, walkDown1: 0, walkDown2: 0, up: 1, type1: 1, type2: 1, walkSide1: 2, walkSide2: 2 };
  for (const [name, f] of Object.entries(want)) assert.equal(accFrame(FRAMES[name], 3), f, name);
});

test('accFrame falls back to frame 0 for single-frame accessories', () => {
  assert.equal(accFrame(FRAMES.up, 1), 0);
  assert.equal(accFrame(FRAMES.walkSide1, 1), 0);
});

test('idle actors sharing a room never pick the same wander point', () => {
  const crowd = new Map();
  const keys = ['a', 'b', 'c', 'd'];
  for (const key of keys) crowd.set(key, new Actor(view({ key }), layout, grid, () => 0.5, crowd));
  for (let t = 0; t < 30000; t += 50) for (const a of crowd.values()) a.update(50);
  const spots = [...crowd.values()].map((a) => `${a.px.x},${a.px.y}`);
  assert.equal(new Set(spots).size, spots.length, `stacked: ${spots.join(' ')}`);
});

test('spriteBox lifts a 32×64 character by its anchor', () => {
  assert.deepEqual(spriteBox({ x: 64, y: 96 }, { w: 32, h: 64, anchor: [0, 32] }), { x: 64, y: 64, w: 32, h: 64 });
});

test('agentColorMap maps shirt, hair and pants keys and skips unknown ramps', () => {
  const pal = {
    keys: { shirt: ['#ff00ff', '#b000b0', '#ff80ff'], hair: ['#00ffff', '#00a0a0', '#80ffff'], pants: ['#ffff00', '#b0b000', '#ffff80'] },
    shirts: { red: ['#d65a4c', '#a9443a', '#ec8478'] },
    hairs: { dark: ['#5a4232', '#402e22', '#7a5c48'] },
    pants: { denim: ['#5a7a9a', '#3f5a78', '#7f9db8'] },
  };
  const full = agentColorMap(pal, { shirt: 'red', hair: 'dark', pants: 'denim' });
  assert.equal(Object.keys(full).length, 9);
  assert.equal(full['#ffff00'], '#5a7a9a');
  assert.equal(full['#b000b0'], '#a9443a');
  assert.deepEqual(agentColorMap(pal, { shirt: 'red', hair: 'nope' }), { '#ff00ff': '#d65a4c', '#b000b0': '#a9443a', '#ff80ff': '#ec8478' });
  const noPantsKeys = { ...pal, keys: { shirt: pal.keys.shirt, hair: pal.keys.hair } };
  assert.equal(Object.keys(agentColorMap(noPantsKeys, { shirt: 'red', hair: 'dark', pants: 'denim' })).length, 6);
});

test('charMeta falls back to a 32×64 box when no char sprite is loaded', () => {
  assert.deepEqual(charMeta({ images: {} }, 'x', 32), { w: 32, h: 64, anchor: [0, 32] });
  const char = { w: 32, h: 64, anchor: [0, 32], frames: 8 };
  assert.equal(charMeta({ images: { char } }, 'x', 32), char);
  const mine = { ...char };
  assert.equal(charMeta({ images: { char, 'char:x': mine } }, 'x', 32), mine);
});
