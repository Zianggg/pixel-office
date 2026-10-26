// Loads art/manifest.json sprites and picks each agent's character sheets.

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

// Size and anchor of the sheet an agent is drawn with ('char' or 'sit'); a 2×2-tile box when no art is loaded.
export function actorMeta(sprites, key, sheet, T) {
  return sprites.images[`${sheet}:${key}`] ?? sprites.images[sheet] ?? { w: 2 * T, h: 2 * T, anchor: [T / 2, T] };
}

// Sprite name for one of an agent's sheets: its own hand-drawn one (<base>_<kit>) when loaded, else the shared one.
export function ownSheet(sprites, base, cfg) {
  const own = cfg?.kit && `${base}_${cfg.kit}`;
  return own && sprites.images[own] ? own : base;
}

// Builds 'char:<key>' and 'sit:<key>': the agent's own sheets, or the shared guest sheets when it has none.
export function addAgentSprite(sprites, key, cfg) {
  for (const base of ['char', 'sit']) {
    const src = sprites.images[ownSheet(sprites, base, cfg)];
    if (src) sprites.images[`${base}:${key}`] = src;
  }
}

const alphaCache = new WeakMap();

// Whether sprite 'name' has a solid pixel at (lx, ly) of the given frame as shown (mirrored when flipped).
// Without art there is nothing to test against, so every point counts as solid.
export function opaqueAt(sprites, name, frame, flip, lx, ly) {
  const s = sprites.images[name];
  if (!s?.canvas) return true;
  let img = alphaCache.get(s.canvas);
  if (!img) {
    img = s.canvas.getContext('2d').getImageData(0, 0, s.canvas.width, s.canvas.height);
    alphaCache.set(s.canvas, img);
  }
  const x = Math.min(frame, s.frames - 1) * s.w + (flip ? s.w - 1 - lx : lx);
  return img.data[(ly * img.width + x) * 4 + 3] > 0;
}
