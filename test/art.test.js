import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { readPng } from './png.js';

const ART = new URL('../public/art/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('manifest.json', ART), 'utf8'));
const palette = JSON.parse(readFileSync(new URL('palette.json', ART), 'utf8'));
const layout = JSON.parse(readFileSync(new URL('../public/layout.json', import.meta.url), 'utf8'));

// Sizes the frontend relies on: [w, h, frames].
const REQUIRED = {
  floor: [32, 32, 1], floor2: [32, 32, 1], wall: [32, 32, 1], wallTrim: [32, 32, 1],
  floorTile: [32, 32, 1], floorCarpet: [32, 32, 1], wallPantry: [32, 32, 1], wallPantryTrim: [32, 32, 1],
  wallGame: [32, 32, 1], wallGameTrim: [32, 32, 1], divider: [32, 32, 1], doorway: [32, 32, 1],
  door: [64, 96, 1], window: [64, 64, 1], desk: [64, 32, 1], deskBoss: [96, 32, 1], chair: [32, 32, 1], chairBoss: [32, 32, 1],
  monitor: [32, 32, 3], pc: [32, 32, 1], keyboard: [32, 16, 1], bookshelf: [64, 64, 1],
  cooler: [32, 64, 1], plant: [32, 64, 1], clock: [32, 32, 1], painting: [64, 32, 1],
  whiteboard: [64, 32, 1], bin: [32, 32, 1], mug: [16, 16, 1], char: [32, 64, 9], sit: [64, 64, 8],
  lamp: [12, 12, 5], bubble: [18, 18, 1], badge: [16, 16, 1],
  rug: [160, 128, 1], coffeeTable: [64, 32, 1], sofa: [96, 32, 1], arcLamp: [32, 64, 1], monstera: [32, 64, 1],
  counter: [96, 64, 1], windowWide: [96, 64, 1], fridge: [32, 96, 1], pantryTable: [64, 32, 1], pantryChair: [32, 32, 1],
  arcade: [32, 64, 1], tvStand: [64, 64, 1], poster: [32, 32, 1], pingpong: [96, 64, 1], beanbag: [32, 32, 1],
};
for (const a of layout.agents) if (a.kit) REQUIRED[`kit_${a.kit}`] = [32, 32, 1];

// Pixels as { color: '#rrggbb', alpha } for the checks below.
function pixels(png) {
  const list = [];
  for (let i = 0; i < png.rgba.length; i += 4) {
    const [r, g, b, alpha] = png.rgba.subarray(i, i + 4);
    list.push({ color: '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join(''), alpha });
  }
  return list;
}

const allowed = new Set(Object.values(palette.colors).map((c) => c.toLowerCase()));

test('manifest lists every sprite the frontend needs, with the agreed size', () => {
  for (const [name, [w, h, frames]] of Object.entries(REQUIRED)) {
    const m = manifest[name];
    assert.ok(m, `missing sprite "${name}"`);
    assert.deepEqual([m.w, m.h, m.frames ?? 1], [w, h, frames], `size of "${name}"`);
  }
});

test('every manifest PNG exists and its IHDR is w*frames × h', () => {
  for (const [name, m] of Object.entries(manifest)) {
    const file = new URL(m.file, ART);
    assert.ok(existsSync(file), `${name}: ${m.file} not found`);
    const png = readPng(file);
    assert.deepEqual([png.w, png.h], [m.w * (m.frames ?? 1), m.h], `${name}: PNG size`);
  }
});

test('sprites use only palette colors, fully opaque or fully transparent', () => {
  for (const [name, m] of Object.entries(manifest)) {
    const bad = new Set();
    for (const px of pixels(readPng(new URL(m.file, ART)))) {
      if (px.alpha === 0) continue;
      if (px.alpha !== 255 || !allowed.has(px.color)) bad.add(`${px.color}@${px.alpha}`);
    }
    assert.deepEqual([...bad], [], `${name}: colors outside palette.json`);
  }
});

test('prop sprites match their tile footprints in layout.json', () => {
  // Props whose sprite is not drawn yet are skipped here; REQUIRED is what demands they exist.
  for (const p of layout.props.filter((q) => manifest[q.sprite])) {
    const m = manifest[p.sprite];
    assert.deepEqual([m.w, m.h], [p.w * layout.tile, p.h * layout.tile], `${p.sprite} footprint`);
  }
  for (const d of layout.desks) {
    const m = manifest[d.boss ? 'deskBoss' : 'desk'];
    assert.equal(m.w, d.w * layout.tile, `desk at ${d.x},${d.y} width`);
  }
});

test('every agent has its own desk kit', () => {
  const kits = layout.agents.map((a) => a.kit);
  assert.ok(kits.every(Boolean), 'an agent has no kit');
  assert.equal(new Set(kits).size, kits.length, 'kits must be unique per agent');
});

test('wall-hung sprites keep a transparent margin so they never touch the wall edges', () => {
  for (const name of ['window', 'windowWide', 'clock', 'painting', 'whiteboard', 'poster']) {
    const m = manifest[name];
    const px = pixels(readPng(new URL(m.file, ART)));
    const w = m.w * (m.frames ?? 1);
    for (let i = 0; i < px.length; i++) {
      const x = i % w;
      const y = Math.floor(i / w);
      const edge = x < 4 || y < 4 || x >= w - 4 || y >= m.h - 4;
      if (edge) assert.equal(px[i].alpha, 0, `${name} touches its edge at ${x},${y}`);
    }
  }
});

test('characters are drawn per agent: no recoloring keys in the palette or the layout', () => {
  for (const k of ['keys', 'shirts', 'hairs', 'pants']) assert.equal(palette[k], undefined, `palette.${k}`);
  for (const a of layout.agents) {
    for (const k of ['shirt', 'hair', 'pants', 'acc']) assert.equal(a[k], undefined, `${a.type}.${k}`);
  }
  assert.deepEqual(Object.keys(manifest).filter((n) => n.startsWith('acc_')), []);
});

test('palette keeps the color names the code reads', () => {
  for (const name of ['sun', 'sunGlow', 'screenOff', 'screenOn', 'screenErr', 'lampGreen', 'lampYellow', 'lampRed', 'lampGrey', 'shadow']) {
    assert.ok(palette.colors[name], `colors.${name} missing`);
  }
  assert.equal(palette.colors.outline, '#3d2a22');
});

// Character ramps from the style guide: tone 1 lightest .. tone 4 darkest.
const RAMPS = ['skinLight', 'skinMid', 'skinDeep', 'hairBlack', 'hairBrown', 'fabricNavy', 'metal'];
const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

test('palette has the 4-tone character ramps, light to dark', () => {
  for (const ramp of RAMPS) {
    const tones = [1, 2, 3, 4].map((n) => palette.colors[`${ramp}${n}`]);
    assert.ok(tones.every(Boolean), `${ramp}1..4 missing`);
    for (let n = 1; n < 4; n++) {
      assert.ok(luminance(tones[n - 1]) > luminance(tones[n]), `${ramp}${n} is not lighter than ${ramp}${n + 1}`);
    }
  }
});

test('floor and wall tiles have no transparent pixels', () => {
  for (const name of ['floor', 'floor2', 'floorTile', 'floorCarpet', 'wall', 'wallTrim', 'wallPantry', 'wallPantryTrim', 'wallGame', 'wallGameTrim', 'divider', 'doorway']) {
    const holes = pixels(readPng(new URL(manifest[name].file, ART))).filter((p) => p.alpha !== 255).length;
    assert.equal(holes, 0, `${name} has ${holes} transparent pixels`);
  }
});

test('no legacy palette remains', () => {
  assert.equal(palette.legacy, undefined);
});

const OWN_SHEETS = Object.keys(manifest).filter((n) => /^(char|sit)_/.test(n));
const SHEET_SIZE = { char: [32, 64, 9, [0, 32]], sit: [64, 64, 8, [16, 32]] };

test('character sheets: char 32×64 × 9 anchor [0, 32], sit 64×64 × 8 anchor [16, 32]', () => {
  for (const name of ['char', 'sit', ...OWN_SHEETS]) {
    const m = manifest[name];
    assert.ok(m, `missing sprite "${name}"`);
    assert.deepEqual([m.w, m.h, m.frames, m.anchor], SHEET_SIZE[name.split('_')[0]], `size/anchor of "${name}"`);
  }
});

test('stand/walk sheets leave the ground shadow to the code: no pixels in rows 61+', () => {
  for (const name of ['char', ...OWN_SHEETS.filter((n) => n.startsWith('char_'))]) {
    const m = manifest[name];
    const px = pixels(readPng(new URL(m.file, ART)));
    const w = m.w * m.frames;
    const low = px.filter((p, i) => p.alpha && Math.floor(i / w) >= 61).length;
    assert.equal(low, 0, `${name} has ${low} pixels in rows 61+`);
  }
});
