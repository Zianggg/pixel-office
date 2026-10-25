// Draws the office: static background once, then per-frame desks, chairs and actors.
import { drawSprite, charMeta } from './sprites.js';
import { spriteBox } from './actors.js';
import { monitorPos, deskKits } from './desks.js';

export { deskKits };

const MONITOR = { off: 0, on: 1, err: 2 };

export function drawStatic(ctx, layout, sprites) {
  const T = layout.tile;
  const k = T / 16;
  const wallRows = layout.wallRows ?? 2;
  ctx.imageSmoothingEnabled = false;
  for (let y = 0; y < layout.rows; y++) {
    for (let x = 0; x < layout.cols; x++) {
      if (y < wallRows) drawSprite(ctx, sprites, y === wallRows - 1 ? 'wallTrim' : 'wall', 0, x * T, y * T, { w: T, h: T });
      else drawSprite(ctx, sprites, (x * 7 + y * 3) % 5 === 0 ? 'floor2' : 'floor', 0, x * T, y * T, { w: T, h: T });
    }
  }
  for (const p of layout.props) drawSprite(ctx, sprites, p.sprite, 0, p.x * T, p.y * T, { w: p.w * T, h: p.h * T });
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
  // Y-sorted: actors and chairs; a chair at the same row draws after the actor so its back covers the legs.
  const items = [
    ...layout.desks.map((d) => ({ y: d.seat[1] * T + 0.5, draw: () => drawSprite(ctx, sprites, 'chair', 0, d.seat[0] * T, d.seat[1] * T, { w: T, h: T }) })),
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
