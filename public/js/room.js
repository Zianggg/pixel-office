// Draws the office: static background once, then per-frame desks, chairs and actors.
import { drawSprite, charMeta } from './sprites.js';
import { spriteBox } from './actors.js';
import { roomAt } from './path.js';
import { monitorPos, deskKits } from './desks.js';
import { staticShadows, footShadow, drawShadows } from './shadow.js';

export { deskKits };

const MONITOR = { off: 0, on: 1, err: 2 };

// Wall sprite for row y of room r, or null when y is below its wall rows.
function wallTile(r, y) {
  const ly = y - r.y;
  if (ly >= r.wallRows) return null;
  return ly === r.wallRows - 1 ? `${r.wall}Trim` : r.wall;
}

// Background sprite name of tile (x, y): a room's wall or floor, a divider top or doorway, or null off the map.
export function tileAt(layout, x, y) {
  const r = roomAt(layout, x, y);
  if (r) {
    const wall = wallTile(r, y);
    if (wall) return wall;
    return r.floor.length > 1 && (x * 7 + y * 3) % 5 === 0 ? r.floor[1] : r.floor[0];
  }
  const d = (layout.dividers ?? []).find((v) => v.x === x && y >= v.y && y < v.y + v.h);
  if (!d) return null;
  if (d.doors.includes(y)) return 'doorway';
  const left = roomAt(layout, x - 1, y);
  return (left && wallTile(left, y)) ?? 'divider';
}

export function drawStatic(ctx, layout, sprites) {
  const T = layout.tile;
  const k = T / 16;
  ctx.imageSmoothingEnabled = false;
  for (let y = 0; y < layout.rows; y++) {
    for (let x = 0; x < layout.cols; x++) {
      const name = tileAt(layout, x, y);
      if (name) drawSprite(ctx, sprites, name, 0, x * T, y * T, { w: T, h: T });
    }
  }
  const shade = sprites.palette?.colors.shadow;
  for (const p of layout.props.filter((q) => q.decal)) drawSprite(ctx, sprites, p.sprite, 0, p.x * T, p.y * T, { w: p.w * T, h: p.h * T });
  if (shade) drawShadows(ctx, staticShadows(layout, sprites.images, T), shade);
  for (const p of layout.props.filter((q) => !q.decal)) drawSprite(ctx, sprites, p.sprite, 0, p.x * T, p.y * T, { w: p.w * T, h: p.h * T });
  const kits = deskKits(layout);
  layout.desks.forEach((d, i) => {
    drawSprite(ctx, sprites, d.boss ? 'deskBoss' : 'desk', 0, d.x * T, d.y * T, { w: d.w * T, h: T });
    drawSprite(ctx, sprites, 'keyboard', 0, d.seat[0] * T, d.y * T + 4 * k, { w: T, h: T / 2 });
    drawSprite(ctx, sprites, kits[i] ?? 'pc', 0, (d.x + d.w - 1) * T, d.y * T - 6 * k, { w: T, h: T });
  });
}

function monitorFrame(agent) {
  if (!agent) return MONITOR.off;
  if (agent.status === 'error') return MONITOR.err;
  if (agent.status === 'working' || agent.status === 'waiting') return MONITOR.on;
  return MONITOR.off;
}

export function drawDynamic(ctx, layout, sprites, state, actors) {
  const T = layout.tile;
  const byDesk = new Map(Object.values(state.agents).map((a) => [a.desk, a]));
  layout.desks.forEach((d, i) => {
    const m = monitorPos(d, T);
    drawSprite(ctx, sprites, 'monitor', monitorFrame(byDesk.get(i)), m.x, m.y, { w: T, h: T });
  });
  const shade = sprites.palette?.colors.shadow;
  if (shade) drawShadows(ctx, [...actors.values()].map((a) => footShadow(spriteBox(a.px, charMeta(sprites, a.view.key, T)))), shade);
  // Y-sorted: actors and chairs; a chair at the same row draws after the actor so its back covers the legs.
  const items = [
    ...layout.desks.map((d, i) => ({ y: d.seat[1] * T + 0.5, draw: () => drawSprite(ctx, sprites, i % 2 ? 'chair2' : 'chair', 0, d.seat[0] * T, d.seat[1] * T, { w: T, h: T }) })),
    ...[...actors.values()].map((a) => ({
      y: a.px.y,
      draw: () => {
        const b = spriteBox(a.px, charMeta(sprites, a.view.key, T));
        drawSprite(ctx, sprites, `char:${a.view.key}`, a.frame, b.x, b.y, { flip: a.flip, w: b.w, h: b.h });
      },
    })),
  ];
  items.sort((a, b) => a.y - b.y).forEach((it) => it.draw());
}
