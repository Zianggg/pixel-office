// Loads art/manifest.json sprites and builds recolored per-agent characters.
import { accFrame, recolor } from './actors.js';

const warned = new Set();

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function toCanvas(img) {
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  c.getContext('2d').drawImage(img, 0, 0);
  return c;
}

export async function loadSprites(base = 'art/') {
  const sprites = { images: {}, palette: null };
  try {
    sprites.palette = await (await fetch(base + 'palette.json')).json();
    const manifest = await (await fetch(base + 'manifest.json')).json();
    await Promise.all(Object.entries(manifest).map(async ([name, meta]) => {
      const img = await loadImage(base + meta.file);
      if (img) sprites.images[name] = { ...meta, frames: meta.frames ?? 1, canvas: toCanvas(img) };
    }));
  } catch {
    console.warn('[office] chưa có art/manifest.json — dùng ô màu thay thế');
  }
  return sprites;
}

export function drawSprite(ctx, sprites, name, frame, dx, dy, { scale = 1, flip = false, w = 16, h = 16 } = {}) {
  const s = sprites.images[name];
  if (!s) {
    if (!warned.has(name)) {
      warned.add(name);
      console.warn(`[office] thiếu sprite "${name}"`);
    }
    // Placeholder: a stable color per sprite name so the layout stays readable without art.
    let hash = 0;
    for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) % 360;
    ctx.fillStyle = `hsl(${hash} 55% 55%)`;
    ctx.fillRect(dx, dy, w * scale, h * scale);
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = Math.max(1, scale / 2);
    ctx.strokeRect(dx + 0.5, dy + 0.5, w * scale - 1, h * scale - 1);
    return;
  }
  const f = Math.min(frame, s.frames - 1);
  ctx.save();
  if (flip) {
    ctx.translate(dx + s.w * scale, dy);
    ctx.scale(-1, 1);
    dx = 0;
    dy = 0;
  }
  ctx.drawImage(s.canvas, f * s.w, 0, s.w, s.h, dx, dy, s.w * scale, s.h * scale);
  ctx.restore();
}

export function addAgentSprite(sprites, key, cfg) {
  const base = sprites.images.char;
  const pal = sprites.palette;
  if (!base || !pal) return;
  const c = document.createElement('canvas');
  c.width = base.canvas.width;
  c.height = base.canvas.height;
  const ctx = c.getContext('2d');
  const src = base.canvas.getContext('2d').getImageData(0, 0, c.width, c.height);
  const map = {};
  const shirt = pal.shirts[cfg.shirt];
  const hair = pal.hairs[cfg.hair];
  if (shirt) pal.keys.shirt.forEach((k, i) => (map[k] = shirt[i]));
  if (hair) pal.keys.hair.forEach((k, i) => (map[k] = hair[i]));
  ctx.putImageData(new ImageData(recolor(src.data, map), c.width, c.height), 0, 0);
  const acc = cfg.acc && sprites.images[`acc_${cfg.acc}`];
  if (acc) {
    const [ax, ay] = acc.anchor ?? [4, 0];
    for (let f = 0; f < base.frames; f++) {
      const af = accFrame(f, acc.frames);
      ctx.drawImage(acc.canvas, af * acc.w, 0, acc.w, acc.h, f * base.w + ax, ay, acc.w, acc.h);
    }
  }
  sprites.images[`char:${key}`] = { ...base, canvas: c };
}
