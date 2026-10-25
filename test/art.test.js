import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

const ART = new URL('../public/art/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('manifest.json', ART), 'utf8'));
const palette = JSON.parse(readFileSync(new URL('palette.json', ART), 'utf8'));
const layout = JSON.parse(readFileSync(new URL('../public/layout.json', import.meta.url), 'utf8'));

// Sizes the frontend relies on: [w, h, frames].
const REQUIRED = {
  floor: [32, 32, 1], floor2: [32, 32, 1], wall: [32, 32, 1], wallTrim: [32, 32, 1],
  door: [64, 96, 1], window: [64, 64, 1], desk: [64, 32, 1], deskBoss: [96, 32, 1], chair: [32, 32, 1],
  monitor: [32, 32, 3], pc: [32, 32, 1], keyboard: [32, 16, 1], bookshelf: [64, 64, 1],
  cooler: [32, 64, 1], plant: [32, 64, 1], clock: [32, 32, 1], painting: [64, 32, 1],
  whiteboard: [64, 32, 1], bin: [32, 32, 1], mug: [16, 16, 1], char: [32, 48, 8],
  acc_tie: [16, 16, 3], acc_cap: [16, 16, 3], acc_glasses: [16, 16, 3], acc_headset: [16, 16, 3],
  acc_bow: [16, 16, 3], acc_beanie: [16, 16, 3], acc_helmet: [16, 16, 3], acc_scarf: [16, 16, 3],
  lamp: [12, 12, 5], bubble: [18, 18, 1], badge: [16, 16, 1],
};
for (const a of layout.agents) if (a.kit) REQUIRED[`kit_${a.kit}`] = [32, 32, 1];

// Minimal PNG reader (8-bit RGB/RGBA/palette, non-interlaced) — enough for the MCP's output.
function readPng(file) {
  const b = readFileSync(file);
  assert.equal(b.readUInt32BE(0), 0x89504e47, `${file} is not a PNG`);
  let p = 8;
  let w, h, depth, ctype, plte, trns;
  const idat = [];
  while (p < b.length) {
    const len = b.readUInt32BE(p);
    const type = b.toString('ascii', p + 4, p + 8);
    const d = b.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') [w, h, depth, ctype] = [d.readUInt32BE(0), d.readUInt32BE(4), d[8], d[9]];
    else if (type === 'PLTE') plte = d;
    else if (type === 'tRNS') trns = d;
    else if (type === 'IDAT') idat.push(d);
    p += 12 + len;
  }
  return { w, h, depth, ctype, plte, trns, idat };
}

function pixels({ w, h, depth, ctype, plte, trns, idat }) {
  assert.equal(depth, 8, 'expected 8-bit PNG');
  const ch = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ctype];
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * ch;
  const out = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? out[y * stride + x - ch] : 0;
      const up = y ? out[(y - 1) * stride + x] : 0;
      const c = x >= ch && y ? out[(y - 1) * stride + x - ch] : 0;
      let v = raw[y * (stride + 1) + 1 + x];
      if (f === 1) v += a;
      else if (f === 2) v += up;
      else if (f === 3) v += (a + up) >> 1;
      else if (f === 4) {
        const pp = a + up - c;
        const [pa, pb, pc] = [Math.abs(pp - a), Math.abs(pp - up), Math.abs(pp - c)];
        v += pa <= pb && pa <= pc ? a : pb <= pc ? up : c;
      }
      out[y * stride + x] = v & 255;
    }
  }
  const hex = (r, g, b) => '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('');
  const list = [];
  for (let i = 0; i < w * h; i++) {
    if (ctype === 3) {
      const k = out[i];
      list.push({ color: hex(plte[k * 3], plte[k * 3 + 1], plte[k * 3 + 2]), alpha: trns && k < trns.length ? trns[k] : 255 });
    } else if (ctype === 2 || ctype === 6) {
      list.push({ color: hex(out[i * ch], out[i * ch + 1], out[i * ch + 2]), alpha: ch === 4 ? out[i * ch + 3] : 255 });
    } else {
      list.push({ color: hex(out[i * ch], out[i * ch], out[i * ch]), alpha: ch === 2 ? out[i * ch + 1] : 255 });
    }
  }
  return list;
}

const allowed = new Set(
  [
    ...Object.values(palette.colors),
    ...palette.keys.shirt,
    ...palette.keys.hair,
  ].map((c) => c.toLowerCase()),
);

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

test('char uses the shirt and hair key colors so it can be recolored', () => {
  const colors = new Set(pixels(readPng(new URL(manifest.char.file, ART))).filter((p) => p.alpha).map((p) => p.color));
  for (const k of [...palette.keys.shirt, ...palette.keys.hair]) assert.ok(colors.has(k.toLowerCase()), `char lacks key ${k}`);
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
  for (const name of ['window', 'clock', 'painting', 'whiteboard']) {
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
