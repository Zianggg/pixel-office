import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ellipseRows, propShadow, footShadow, staticShadows } from '../public/js/shadow.js';

const layout = JSON.parse(readFileSync(new URL('../public/layout.json', import.meta.url), 'utf8'));
const manifest = JSON.parse(readFileSync(new URL('../public/art/manifest.json', import.meta.url), 'utf8'));
const T = layout.tile;

test('ellipseRows gives whole-pixel rows, widest in the middle, symmetric about cx', () => {
  const rows = ellipseRows(20, 10, 8, 3);
  assert.equal(rows.length, 6);
  assert.deepEqual(rows.map((r) => r.y), [7, 8, 9, 10, 11, 12]);
  for (const r of rows) {
    assert.ok(Number.isInteger(r.x) && Number.isInteger(r.w));
    assert.equal(r.x + r.w / 2, 20);
  }
  assert.equal(Math.max(...rows.map((r) => r.w)), rows[2].w);
  assert.ok(rows[0].w < rows[2].w);
  assert.deepEqual(rows.map((r) => r.w), [...rows.map((r) => r.w)].reverse());
});

test('propShadow hugs the bottom edge and leans right, away from the top-left light', () => {
  const s = propShadow({ x: 64, y: 32, w: 96, h: 32 });
  assert.equal(s.cy, 32 + 32 - 2);
  assert.ok(s.cx > 64 + 48);
  assert.ok(s.rx <= 48 && s.rx >= 40);
  assert.ok(s.ry >= 2 && s.ry <= 4);
});

test('footShadow sits under the feet of a 32×64 character box', () => {
  const s = footShadow({ x: 100, y: 200, w: 32, h: 64 });
  assert.equal(s.cx, 116);
  assert.ok(s.cy > 200 + 54 && s.cy < 200 + 64);
  assert.ok(s.rx < 16);
});

test('staticShadows covers desks, chairs and flagged floor props, never decals or wall art', () => {
  const list = staticShadows(layout, manifest, T);
  const at = (x, y) => list.some((s) => s.cy > y * T && s.cy < (y + 2) * T && s.cx > x * T && s.cx < (x + 4) * T);
  for (const d of layout.desks) assert.ok(at(d.x, d.y), `desk at ${d.x},${d.y}`);
  for (const d of layout.desks) assert.ok(at(d.seat[0] - 1, d.seat[1]), `chair at ${d.seat}`);
  const flagged = layout.props.filter((p) => !p.decal && manifest[p.sprite]?.shadow);
  assert.ok(flagged.some((p) => p.sprite === 'sofa'), 'sofa is flagged');
  assert.ok(flagged.some((p) => p.sprite === 'arcade'), 'arcade is flagged');
  assert.equal(list.length, layout.desks.length * 2 + flagged.length);
  for (const p of layout.props.filter((q) => q.decal || q.sprite.startsWith('window'))) assert.ok(!manifest[p.sprite]?.shadow, `${p.sprite} must not cast a floor shadow`);
});
