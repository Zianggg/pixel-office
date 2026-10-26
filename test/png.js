// Minimal PNG reader for art tests (8-bit gray/RGB/palette/RGBA, non-interlaced) plus frame mask helpers.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

// Decodes a PNG file to { w, h, rgba } with 4 bytes per pixel.
export function readPng(file) {
  const b = readFileSync(file);
  assert.equal(b.readUInt32BE(0), 0x89504e47, `${file} is not a PNG`);
  let p = 8;
  let w, h, depth, ctype, interlace, plte, trns;
  const idat = [];
  while (p < b.length) {
    const len = b.readUInt32BE(p);
    const type = b.toString('ascii', p + 4, p + 8);
    const d = b.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') [w, h, depth, ctype, interlace] = [d.readUInt32BE(0), d.readUInt32BE(4), d[8], d[9], d[12]];
    else if (type === 'PLTE') plte = d;
    else if (type === 'tRNS') trns = d;
    else if (type === 'IDAT') idat.push(d);
    p += 12 + len;
  }
  assert.equal(depth, 8, `${file}: expected 8-bit PNG`);
  assert.equal(interlace, 0, `${file}: interlaced PNG`);
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
  const rgba = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    if (ctype === 3) {
      const k = out[i];
      rgba.set([plte[k * 3], plte[k * 3 + 1], plte[k * 3 + 2], trns && k < trns.length ? trns[k] : 255], o);
    } else if (ctype === 2 || ctype === 6) {
      rgba.set([out[i * ch], out[i * ch + 1], out[i * ch + 2], ch === 4 ? out[i * ch + 3] : 255], o);
    } else {
      const g = out[i * ch];
      rgba.set([g, g, g, ch === 2 ? out[i * ch + 1] : 255], o);
    }
  }
  return { w, h, rgba };
}

// 1 where frame `frame` (frames laid out left to right, fw × fh each) has a fully opaque pixel.
export function frameMask(png, frame, fw, fh) {
  const mask = new Uint8Array(fw * fh);
  for (let y = 0; y < fh; y++) {
    for (let x = 0; x < fw; x++) {
      mask[y * fw + x] = png.rgba[(y * png.w + frame * fw + x) * 4 + 3] === 255 ? 1 : 0;
    }
  }
  return mask;
}

// First and last rows with a set pixel; -1 for both when the mask is empty.
export function rowsWithPixels(mask, fw, fh) {
  let top = -1;
  let bottom = -1;
  for (let y = 0; y < fh; y++) {
    if (!mask.subarray(y * fw, (y + 1) * fw).some(Boolean)) continue;
    if (top < 0) top = y;
    bottom = y;
  }
  return { top, bottom };
}

// Intersection over union of two equal-size masks (0 when both are empty).
export function iou(a, b) {
  let both = 0;
  let either = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] && b[i]) both++;
    if (a[i] || b[i]) either++;
  }
  return either ? both / either : 0;
}

// '#rrggbb' of every non-transparent pixel.
export function colorsOf(png) {
  const set = new Set();
  for (let i = 0; i < png.rgba.length; i += 4) {
    if (png.rgba[i + 3] === 0) continue;
    set.add('#' + [png.rgba[i], png.rgba[i + 1], png.rgba[i + 2]].map((n) => n.toString(16).padStart(2, '0')).join(''));
  }
  return set;
}
