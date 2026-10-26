import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readPng, frameMask, rowsWithPixels, iou, colorsOf } from './png.js';

const ART = new URL('../public/art/', import.meta.url);
const palette = JSON.parse(readFileSync(new URL('palette.json', ART), 'utf8'));
const allowed = new Set(Object.values(palette.colors).map((c) => c.toLowerCase()));

const CHAR = { idle1: 0, idle2: 1, walk1: 2, walk2: 3, walk3: 4, walk4: 5, back: 6, walkBack1: 7, walkBack2: 8 };
const SIT = { type1: 0, type2: 1, type3: 2, type4: 3, wait1: 4, wait2: 5, error1: 6, error2: 7 };
const SIZE = { char: [32, 64, 9, [0, 32]], sit: [64, 64, 8, [16, 32]] };

// Every character sheet in a manifest that has at least one opaque pixel, grouped per character:
// 'char'/'sit' is the guest, 'char_<kit>'/'sit_<kit>' an agent's own sheets.
function sheetsIn(dir) {
  const manifest = JSON.parse(readFileSync(new URL('manifest.json', dir), 'utf8'));
  const out = [];
  for (const [name, meta] of Object.entries(manifest)) {
    const m = /^(char|sit)(?:_(.+))?$/.exec(name);
    if (!m) continue;
    const png = readPng(new URL(meta.file, dir));
    if (!png.rgba.some((v, i) => i % 4 === 3 && v === 255)) continue;
    out.push({ name, base: m[1], who: m[2] ?? 'guest', meta, png });
  }
  return out;
}

const sheets = sheetsIn(ART);
const characters = new Map();
for (const s of sheets) {
  const c = characters.get(s.who) ?? { who: s.who };
  c[s.base] = s;
  characters.set(s.who, c);
}
const charSheets = sheets.filter((s) => s.base === 'char');
const sitSheets = sheets.filter((s) => s.base === 'sit');
const rows = (s, frame) => rowsWithPixels(frameMask(s.png, frame, s.meta.w, s.meta.h), s.meta.w, s.meta.h);

test('all 10 characters are present: each agent kit and the guest have char and sit sheets with pixels', () => {
  const layout = JSON.parse(readFileSync(new URL('../public/layout.json', import.meta.url), 'utf8'));
  const who = [...layout.agents.map((a) => a.kit), 'guest'];
  assert.equal(who.length, 10);
  const missing = who.flatMap((w) => ['char', 'sit'].filter((b) => !characters.get(w)?.[b]).map((b) => `${b} of ${w}`));
  assert.deepEqual(missing, []);
});

test('char sheets are 32×64 × 9, anchor [0,32]; sit sheets 64×64 × 8, anchor [16,32]', () => {
  for (const s of sheets) {
    const [w, h, frames, anchor] = SIZE[s.base];
    assert.deepEqual([s.meta.w, s.meta.h, s.meta.frames, s.meta.anchor], [w, h, frames, anchor], `${s.name} size/anchor`);
    assert.deepEqual([s.png.w, s.png.h], [w * frames, h], `${s.name} PNG size`);
  }
});

test('character feet sit on row 60 and rows 61+ stay empty', () => {
  for (const s of charSheets) {
    const { top, bottom } = rows(s, CHAR.idle1);
    assert.equal(bottom, 60, `${s.name} idle1 feet on row ${bottom}`);
    const height = bottom - top + 1;
    assert.ok(height >= 58 && height <= 60, `${s.name} idle1 is ${height} px tall`);
    for (let f = 0; f < s.meta.frames; f++) {
      assert.ok(rows(s, f).bottom <= 60, `${s.name} frame ${f} has pixels in rows 61+`);
    }
  }
});

test('breathing moves at most 1 px', () => {
  for (const s of charSheets) {
    const [a, b] = [rows(s, CHAR.idle1), rows(s, CHAR.idle2)];
    assert.ok(Math.abs(a.top - b.top) <= 1, `${s.name} head moves ${a.top} → ${b.top}`);
    assert.equal(a.bottom, b.bottom, `${s.name} feet move ${a.bottom} → ${b.bottom}`);
  }
});

test('walking frames keep feet on the ground', () => {
  for (const s of charSheets) {
    for (const f of ['walk1', 'walk2', 'walk3', 'walk4', 'walkBack1', 'walkBack2']) {
      const { bottom } = rows(s, CHAR[f]);
      assert.ok(bottom >= 58 && bottom <= 60, `${s.name} ${f} lowest row ${bottom}`);
    }
  }
});

test('seated typing keeps the head still', () => {
  for (const s of sitSheets) {
    const tops = ['type1', 'type2', 'type3', 'type4'].map((f) => rows(s, SIT[f]).top);
    assert.ok(tops.every((t) => t === tops[0] && t >= 0), `${s.name} head rows ${tops.join(',')}`);
  }
});

test('each character uses at most 16 palette colors', () => {
  for (const c of characters.values()) {
    const colors = new Set([c.char, c.sit].filter(Boolean).flatMap((s) => [...colorsOf(s.png)]));
    assert.ok(colors.size <= 16, `${c.who} uses ${colors.size} colors`);
    const off = [...colors].filter((x) => !allowed.has(x));
    assert.deepEqual(off, [], `${c.who} colors outside palette.json`);
  }
});

test('idle silhouettes differ: IoU < 0.85 for every pair', () => {
  const real = [...characters.values()].filter((c) => c.char);
  const masks = real.map((c) => [c.who, frameMask(c.char.png, CHAR.idle1, 32, 64)]);
  for (let i = 0; i < masks.length; i++) {
    for (let j = i + 1; j < masks.length; j++) {
      const v = iou(masks[i][1], masks[j][1]);
      assert.ok(v < 0.85, `${masks[i][0]} vs ${masks[j][0]}: IoU ${v.toFixed(2)}`);
    }
  }
});
