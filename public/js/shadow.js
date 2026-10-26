// Soft ground shadows: whole-pixel ellipses drawn translucent on the floor under furniture and characters.

// Rows [{x, y, w}] of a pixel ellipse centred on (cx, cy): 2*ry rows, symmetric, no anti-aliasing.
export function ellipseRows(cx, cy, rx, ry) {
  const rows = [];
  for (let i = 0; i < 2 * ry; i++) {
    const t = (i + 0.5 - ry) / ry;
    const half = Math.max(1, Math.round(rx * Math.sqrt(1 - t * t)));
    rows.push({ x: cx - half, y: cy - ry + i, w: 2 * half });
  }
  return rows;
}

// Shadow under a floor-standing sprite: hugs its bottom edge, nudged right, away from the top-left light.
export function propShadow(box) {
  return {
    cx: Math.round(box.x + box.w / 2) + 2,
    cy: box.y + box.h - 2,
    rx: Math.round(box.w / 2) - 2,
    ry: Math.min(4, Math.max(2, Math.round(box.w / 10))),
  };
}

// Shadow under a character's feet; the feet sit a few pixels above the bottom of the sprite box.
export function footShadow(box) {
  return { cx: Math.round(box.x + box.w / 2), cy: box.y + box.h - 5, rx: Math.round(box.w * 0.3), ry: 2 };
}

// Shadows that never move: desks, their chairs, and props whose manifest entry sets "shadow".
export function staticShadows(layout, manifest, T) {
  const list = [];
  for (const d of layout.desks) {
    list.push(propShadow({ x: d.x * T, y: d.y * T, w: d.w * T, h: T }));
    list.push(propShadow({ x: d.seat[0] * T, y: d.seat[1] * T, w: T, h: T }));
  }
  for (const p of layout.props) {
    if (!p.decal && manifest[p.sprite]?.shadow) list.push(propShadow({ x: p.x * T, y: p.y * T, w: p.w * T, h: p.h * T }));
  }
  return list;
}

export function drawShadows(ctx, shadows, color, alpha = 0.3) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  for (const s of shadows) for (const r of ellipseRows(s.cx, s.cy, s.rx, s.ry)) ctx.fillRect(r.x, r.y, r.w, 1);
  ctx.restore();
}
