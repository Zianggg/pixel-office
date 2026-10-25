import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { glowSources, sunBeams, monitorPos, lampGlowColor } from '../public/js/glow.js';

const layout = JSON.parse(readFileSync(new URL('../public/layout.json', import.meta.url), 'utf8'));
const palette = JSON.parse(readFileSync(new URL('../public/art/palette.json', import.meta.url), 'utf8'));
const P = palette.colors;
const T = layout.tile;
const k = T / 16;
const stateWith = (agents) => ({ agents: Object.fromEntries(agents.map((a) => [a.key, a])), totals: {} });

const windows = layout.props.filter((p) => p.sprite === 'window');

test('sunlight glows through every window, not through the door', () => {
  const suns = glowSources(layout, stateWith([]), palette, 0).filter((s) => s.kind === 'sun');
  assert.ok(windows.length >= 2, 'layout needs windows');
  assert.deepEqual(
    suns.map((s) => [s.x, s.y, s.color]),
    windows.map((w) => [(w.x + w.w / 2) * T, (w.y + w.h / 2) * T, P.sunGlow]),
  );
  const door = layout.props.find((p) => p.sprite === 'door');
  assert.ok(suns.every((s) => s.x !== (door.x + door.w / 2) * T), 'door must not glow');
});

test('each window casts a short beam that starts at the floor line and widens', () => {
  const beams = sunBeams(layout, palette);
  assert.equal(beams.length, windows.length);
  beams.forEach((b, i) => {
    assert.equal(b.top.y, layout.wallRows * T);
    assert.ok(b.bottom.y > b.top.y);
    assert.ok(b.bottom.y - b.top.y <= T, 'beam reaches too far into the room');
    assert.ok(b.top.x0 >= windows[i].x * T && b.top.x1 <= (windows[i].x + windows[i].w) * T);
    assert.ok(b.bottom.x1 - b.bottom.x0 > b.top.x1 - b.top.x0);
    assert.equal(b.color, P.sun);
  });
});

test('a working agent lights its monitor green', () => {
  const src = glowSources(layout, stateWith([{ key: 'a', desk: 3, status: 'working' }]), palette, 0);
  const mon = src.filter((s) => s.kind === 'monitor');
  assert.equal(mon.length, 1);
  assert.deepEqual([mon[0].x, mon[0].y, mon[0].color], [16 * T + 8 * k, 5 * T - 10 * k + 5 * k, P.screenOn]);
});

test('an erroring agent lights its monitor red; idle and done agents give no monitor glow', () => {
  const src = glowSources(layout, stateWith([
    { key: 'e', desk: 1, status: 'error' },
    { key: 'i', desk: 2, status: 'idle' },
    { key: 'd', desk: 4, status: 'done' },
  ]), palette, 0);
  const mon = src.filter((s) => s.kind === 'monitor');
  assert.equal(mon.length, 1);
  assert.equal(mon[0].color, P.screenErr);
});

test('only desks that keep a plain pc (no personal kit) show an LED glow', () => {
  const leds = glowSources(layout, stateWith([]), palette, 0).filter((s) => s.kind === 'led');
  const kitDesks = new Set(layout.agents.filter((a) => a.kit).map((a) => a.desk));
  assert.equal(leds.length, layout.desks.filter((_, i) => !kitDesks.has(i)).length);
  assert.ok(leds.every((l) => l.r <= 4 * k && l.color === P.screenOn));
});

test('monitor sits in front of the seat, so the boss monitor is centered on the boss chair', () => {
  const boss = layout.desks.find((d) => d.boss);
  assert.deepEqual(monitorPos(boss, T), { x: boss.seat[0] * T, y: boss.y * T - 10 * k });
});

test('status lamps glow in their status color, idle lamps do not glow', () => {
  assert.equal(lampGlowColor('working', palette), P.lampGreen);
  assert.equal(lampGlowColor('done', palette), P.lampGreen);
  assert.equal(lampGlowColor('waiting', palette), P.lampYellow);
  assert.equal(lampGlowColor('error', palette), P.lampRed);
  assert.equal(lampGlowColor('idle', palette), null);
});
