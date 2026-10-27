import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { deskKits, tileAt, drawDynamic } from '../public/js/room.js';

const layout = JSON.parse(readFileSync(new URL('../public/layout.json', import.meta.url), 'utf8'));

test('each agent desk shows that agent kit; spare desks show none', () => {
  const kits = deskKits(layout);
  assert.equal(kits.length, layout.desks.length);
  for (const a of layout.agents) assert.equal(kits[a.desk], `kit_${a.kit}`, a.type);
  layout.desks.forEach((d, i) => { if (d.spare) assert.equal(kits[i], null); });
});

test('tileAt names wall, trim, floor, divider and doorway tiles', () => {
  const l = layout;
  assert.equal(tileAt(l, 5, 0), 'wall');
  assert.equal(tileAt(l, 5, 2), 'wallTrim');
  assert.equal(tileAt(l, 30, 1), 'wallPantry');
  assert.equal(tileAt(l, 30, 2), 'wallPantryTrim');
  assert.equal(tileAt(l, 30, 10), 'wallGame');
  assert.equal(tileAt(l, 30, 11), 'wallGameTrim');
  assert.equal(tileAt(l, 30, 4), 'floorTile');
  assert.equal(tileAt(l, 30, 14), 'floorCarpet');
  assert.ok(['floor', 'floor2'].includes(tileAt(l, 5, 5)));
  assert.equal(tileAt(l, 24, 1), 'wall');
  assert.equal(tileAt(l, 24, 2), 'wallTrim');
  assert.equal(tileAt(l, 24, 8), 'divider');
  assert.equal(tileAt(l, 24, 5), 'doorway');
  assert.equal(tileAt(l, 24, 15), 'doorway');
  assert.equal(tileAt(l, 99, 0), null);
});


// Records which sprite canvas each drawImage call used, in draw order.
function recordingCtx() {
  const drawn = [];
  const noop = () => {};
  return { drawn, save: noop, restore: noop, translate: noop, scale: noop, fillRect: noop, strokeRect: noop, beginPath: noop, ellipse: noop, fill: noop,
    drawImage: (canvas, sx, sy, sw, sh, dx, dy) => drawn.push({ name: canvas.name, dx, dy }) };
}
const img = (name, w, h, frames = 1, anchor = [0, 0]) => ({ canvas: { name }, w, h, frames, anchor });

test('a seated agent keeps its desk chair, drawn over it so the chair back covers the body', () => {
  const T = layout.tile;
  const desk = layout.desks[1];
  const sprites = { images: { chair: img('chair', 32, 32), chairBoss: img('chairBoss', 32, 32), monitor: img('monitor', 32, 32, 3), 'sit:a': img('sit:a', 64, 64, 8, [16, 32]) }, palette: { colors: {} } };
  const actor = { seatedAtDesk: true, x: desk.seat[0], y: desk.seat[1], px: { x: desk.seat[0] * T, y: desk.seat[1] * T }, view: { key: 'a' }, sprite: { sheet: 'sit', frame: 0, flip: false } };
  const ctx = recordingCtx();
  drawDynamic(ctx, layout, sprites, { agents: {} }, new Map([['a', actor]]));
  const at = ctx.drawn.findIndex((d) => d.name === 'chair' && d.dx === desk.seat[0] * T && d.dy === desk.seat[1] * T);
  assert.ok(at >= 0, 'the occupied desk chair is drawn');
  assert.ok(at > ctx.drawn.findIndex((d) => d.name === 'sit:a'), 'the chair is drawn after the seated agent');
});
