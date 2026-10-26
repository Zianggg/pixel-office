import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildGrid } from '../public/js/path.js';
import { Actor, FRAMES, SIT_FRAMES, spriteBox, pickActor } from '../public/js/actors.js';
import { ownSheet, actorMeta, opaqueAt, addAgentSprite } from '../public/js/sprites.js';

const layout = JSON.parse(readFileSync(new URL('../public/layout.json', import.meta.url), 'utf8'));
const grid = buildGrid(layout);
const T = layout.tile;
const view = (o) => ({ key: 'unity-qa-tester', desk: 6, status: 'idle', instances: 0, ...o });
const runFor = (actor, ms, step = 50) => { for (let t = 0; t < ms; t += step) actor.update(step, () => 0.5); };
const still = (a) => { a.idleWait = 1e9; return a; };
const settle = (a, status, desk = 6) => { a.sync(view({ desk, status }), 0); runFor(a, 20000); return a; };
// First walkable tile with n walkable tiles straight on in direction (dx, dy).
function straightRun(dx, dy, n = 3) {
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[0].length; x++) {
      let ok = grid[y][x];
      for (let k = 1; ok && k <= n; k++) ok = Boolean(grid[y + dy * k]?.[x + dx * k]);
      if (ok) return [x, y];
    }
  }
  throw new Error('no straight run');
}
// Puts an idle actor on (x, y), walks it n tiles in direction (dx, dy) and returns the sprites seen every stepMs.
function walk(a, [x, y], dx, dy, n = 3, stepMs = 150) {
  still(a);
  a.x = x;
  a.y = y;
  a.path = [];
  a.goTo([x + dx * n, y + dy * n]);
  const seen = [];
  while (a.path.length) {
    a.update(stepMs);
    if (a.path.length) seen.push(a.sprite);
  }
  return seen;
}

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

test('idle actors sharing a room never pick the same wander point', () => {
  const crowd = new Map();
  const keys = ['a', 'b', 'c', 'd'];
  for (const key of keys) crowd.set(key, new Actor(view({ key }), layout, grid, () => 0.5, crowd));
  for (let t = 0; t < 30000; t += 50) for (const a of crowd.values()) a.update(50);
  const spots = [...crowd.values()].map((a) => `${a.px.x},${a.px.y}`);
  assert.equal(new Set(spots).size, spots.length, `stacked: ${spots.join(' ')}`);
});

test('spriteBox centres a 64×64 character on its tile by the [16, 32] anchor', () => {
  assert.deepEqual(spriteBox({ x: 64, y: 96 }, { w: 64, h: 64, anchor: [16, 32] }), { x: 48, y: 64, w: 64, h: 64 });
});

test('addAgentSprite uses the own sheet when drawn, else the shared one as is (no recoloring)', () => {
  const char = { w: 32, h: 64, frames: 9, anchor: [0, 32] };
  const sit = { w: 64, h: 64, frames: 8, anchor: [16, 32] };
  const sitQa = { ...sit };
  const sprites = { images: { char, sit, sit_qa: sitQa }, palette: { colors: {} } };
  addAgentSprite(sprites, 'unity-qa-tester', { kit: 'qa' });
  assert.equal(sprites.images['char:unity-qa-tester'], char);
  assert.equal(sprites.images['sit:unity-qa-tester'], sitQa);
  addAgentSprite(sprites, 'art-helper', {});
  assert.equal(sprites.images['char:art-helper'], char);
  assert.equal(sprites.images['sit:art-helper'], sit);
});

test('pickActor returns the front-most actor where two sprites overlap', () => {
  const meta = { w: 32, h: 64, anchor: [0, 32] };
  const front = { px: { x: 64, y: 128 }, view: { key: 'front' } };
  const back = { px: { x: 64, y: 96 }, view: { key: 'back' } };
  // Front was added first, so a plain reverse-insertion search would wrongly return the one behind.
  const crowd = new Map([['front', front], ['back', back]]);
  assert.equal(pickActor(crowd.values(), 80, 110, () => meta), front);
  assert.equal(pickActor(crowd.values(), 80, 70, () => meta), back);
  assert.equal(pickActor(crowd.values(), 10, 10, () => meta), undefined);
});


test('a new actor stands at the spawn tile on idle1, unflipped', () => {
  const a = new Actor(view(), layout, grid);
  assert.deepEqual(a.px, { x: layout.spawn[0] * T, y: layout.spawn[1] * T });
  assert.deepEqual(a.sprite, { sheet: 'char', frame: FRAMES.idle1, flip: false });
});

test('a standing actor breathes: idle1 for 600ms, then idle2 for 400ms', () => {
  const a = still(new Actor(view(), layout, grid));
  const frames = [0, 599, 2, 398, 2].map((dt) => { a.update(dt); return a.sprite.frame; });
  assert.deepEqual(frames, [FRAMES.idle1, FRAMES.idle1, FRAMES.idle2, FRAMES.idle2, FRAMES.idle1]);
});

test('walking down cycles walk1-4 at 150ms and clears flip', () => {
  const a = new Actor(view(), layout, grid);
  a.flip = true;
  const seen = walk(a, straightRun(0, 1), 0, 1);
  assert.deepEqual(new Set(seen.map((s) => s.frame)), new Set([FRAMES.walk1, FRAMES.walk2, FRAMES.walk3, FRAMES.walk4]));
  assert.ok(seen.every((s) => s.sheet === 'char' && s.flip === false));
});

test('walking up cycles back frames 7, 6, 8, 6', () => {
  const a = new Actor(view(), layout, grid);
  const seen = walk(a, straightRun(0, -1), 0, -1).map((s) => s.frame);
  assert.ok(seen.length >= 6, `only ${seen.length} frames`);
  assert.ok('7686'.repeat(20).includes(seen.join('')), seen.join(','));
});

test('flip turns on walking left, stays when walking up or stopping, clears walking down', () => {
  const a = new Actor(view(), layout, grid);
  assert.ok(walk(a, straightRun(-1, 0), -1, 0).every((s) => s.flip));
  assert.ok(walk(a, straightRun(0, -1), 0, -1).every((s) => s.flip));
  a.update(1000);
  assert.equal(a.sprite.flip, true);
  walk(a, straightRun(1, 0), 1, 0);
  assert.equal(a.sprite.flip, false);
  a.flip = true;
  assert.ok(walk(a, straightRun(0, 1), 0, 1).every((s) => !s.flip));
});

test('working at a desk shows the sit sheet typing frames 0-3 at 180ms', () => {
  const a = settle(new Actor(view(), layout, grid), 'working');
  const [sx, sy] = layout.desks[6].seat;
  assert.deepEqual(a.px, { x: sx * T, y: sy * T });
  assert.equal(a.seatedAtDesk, true);
  const seen = new Set();
  for (let i = 0; i < 8; i++) {
    a.update(180);
    seen.add(a.sprite.frame);
    assert.equal(a.sprite.sheet, 'sit');
    assert.equal(a.sprite.flip, false);
  }
  assert.deepEqual(seen, new Set([SIT_FRAMES.type1, SIT_FRAMES.type2, SIT_FRAMES.type3, SIT_FRAMES.type4]));
});

test('waiting at a desk alternates wait1/wait2 at 500ms; error alternates error1/error2 at 300ms', () => {
  const w = settle(new Actor(view(), layout, grid), 'waiting');
  const ws = new Set();
  for (let i = 0; i < 4; i++) { w.update(500); ws.add(w.sprite.frame); }
  assert.deepEqual(ws, new Set([SIT_FRAMES.wait1, SIT_FRAMES.wait2]));
  const e = settle(new Actor(view(), layout, grid), 'error');
  const es = new Set();
  for (let i = 0; i < 4; i++) { e.update(300); es.add(e.sprite.frame); }
  assert.deepEqual(es, new Set([SIT_FRAMES.error1, SIT_FRAMES.error2]));
});

test('status changes while seated jump straight to the new group', () => {
  const a = settle(new Actor(view(), layout, grid), 'working');
  a.update(500);
  const groups = { error: [6, 7], waiting: [4, 5], working: [0, 1, 2, 3] };
  for (const status of ['error', 'waiting', 'working', 'error']) {
    a.sync(view({ status }), 0);
    for (let i = 0; i < 5; i++) {
      assert.equal(a.sprite.sheet, 'sit', status);
      assert.ok(groups[status].includes(a.sprite.frame), `${status}: frame ${a.sprite.frame}`);
      a.update(170);
    }
  }
});

test('working at the guest spot stands on the char sheet', () => {
  const a = new Actor(view({ desk: -1 }), layout, grid);
  a.sync(view({ desk: -1, status: 'working' }), 0);
  runFor(a, 20000);
  assert.deepEqual(a.px, { x: layout.guest[0] * T, y: layout.guest[1] * T });
  assert.equal(a.seatedAtDesk, false);
  assert.equal(a.sprite.sheet, 'char');
  assert.ok([FRAMES.idle1, FRAMES.idle2].includes(a.sprite.frame));
});

test('finished actor leaves the seat and stands again', () => {
  const a = settle(new Actor(view(), layout, grid), 'working');
  a.sync(view({ status: 'done' }), 0);
  runFor(a, 30000);
  const [sx, sy] = layout.desks[6].seat;
  assert.notDeepEqual(a.px, { x: sx * T, y: sy * T });
  assert.equal(a.seatedAtDesk, false);
  assert.equal(a.sprite.sheet, 'char');
});

test('pickActor skips transparent pixels and picks the actor behind', () => {
  const meta = { w: 64, h: 64, anchor: [16, 32] };
  const front = { px: { x: 64, y: 128 }, view: { key: 'front' } };
  const back = { px: { x: 64, y: 96 }, view: { key: 'back' } };
  // Only the back actor is solid at the clicked point; the front one's box is empty there.
  const opaque = (a, lx, ly) => a === back && lx === 20 && ly === 50;
  assert.equal(pickActor([front, back], 48 + 20, 64 + 50, () => meta, opaque), back);
  assert.equal(pickActor([front, back], 48 + 20, 64 + 50, () => meta, () => false), undefined);
  assert.equal(pickActor([front, back], 48 + 20, 64 + 50, () => meta), front);
});

test('ownSheet picks char_<kit> and sit_<kit> independently', () => {
  const sprites = { images: { char: {}, sit: {}, char_boss: {} } };
  assert.equal(ownSheet(sprites, 'char', { kit: 'boss' }), 'char_boss');
  assert.equal(ownSheet(sprites, 'sit', { kit: 'boss' }), 'sit');
  assert.equal(ownSheet(sprites, 'char', { kit: 'qa' }), 'char');
  assert.equal(ownSheet(sprites, 'sit', undefined), 'sit');
});

test('actorMeta falls back to the shared sheet, then to a 2×2-tile box', () => {
  assert.deepEqual(actorMeta({ images: {} }, 'x', 'char', 32), { w: 64, h: 64, anchor: [16, 32] });
  const sit = { w: 64, h: 64, anchor: [16, 32], frames: 8 };
  assert.equal(actorMeta({ images: { sit } }, 'x', 'sit', 32), sit);
  const mine = { ...sit };
  assert.equal(actorMeta({ images: { sit, 'sit:x': mine } }, 'x', 'sit', 32), mine);
});

test('opaqueAt reads alpha in the shown frame and mirrors when flipped; true without art', () => {
  // A 2-frame sheet of 4×1 frames; only frame 1, x 0 is solid.
  const data = new Uint8ClampedArray(8 * 4);
  data[4 * 4 + 3] = 255;
  const canvas = { width: 8, height: 1, getContext: () => ({ getImageData: () => ({ data, width: 8, height: 1 }) }) };
  const s = { images: { x: { w: 4, h: 1, frames: 2, canvas } } };
  assert.equal(opaqueAt(s, 'x', 1, false, 0, 0), true);
  assert.equal(opaqueAt(s, 'x', 1, true, 3, 0), true);
  assert.equal(opaqueAt(s, 'x', 1, false, 1, 0), false);
  assert.equal(opaqueAt(s, 'x', 0, false, 0, 0), false);
  assert.equal(opaqueAt({ images: {} }, 'y', 0, false, 0, 0), true);
});
