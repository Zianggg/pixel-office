// Draws the office: static background once, then per-frame desks, chairs and actors.
import { drawSprite } from './sprites.js';

const T = 16;
const WALL_ROWS = 2;
const MONITOR = { off: 0, on: 1, err: 2 };

export function drawStatic(ctx, layout, sprites) {
  ctx.imageSmoothingEnabled = false;
  for (let y = 0; y < layout.rows; y++) {
    for (let x = 0; x < layout.cols; x++) {
      if (y < WALL_ROWS) drawSprite(ctx, sprites, y === WALL_ROWS - 1 ? 'wallTrim' : 'wall', 0, x * T, y * T);
      else drawSprite(ctx, sprites, (x * 7 + y * 3) % 5 === 0 ? 'floor2' : 'floor', 0, x * T, y * T);
    }
  }
  for (const p of layout.props) drawSprite(ctx, sprites, p.sprite, 0, p.x * T, p.y * T, { w: p.w * T, h: p.h * T });
  for (const d of layout.desks) {
    drawSprite(ctx, sprites, d.boss ? 'deskBoss' : 'desk', 0, d.x * T, d.y * T, { w: d.w * T, h: T });
    drawSprite(ctx, sprites, 'keyboard', 0, d.x * T, d.y * T + 4);
    drawSprite(ctx, sprites, 'pc', 0, (d.x + d.w - 1) * T, d.y * T - 6);
  }
  const boss = layout.desks.find((d) => d.boss);
  if (boss) drawSprite(ctx, sprites, 'mug', 0, (boss.x + 1) * T + 8, boss.y * T);
}

function monitorFrame(agent) {
  if (!agent) return MONITOR.off;
  if (agent.status === 'error') return MONITOR.err;
  if (agent.status === 'working' || agent.status === 'waiting') return MONITOR.on;
  return MONITOR.off;
}

export function drawDynamic(ctx, layout, sprites, state, actors) {
  const byDesk = new Map(Object.values(state.agents).map((a) => [a.desk, a]));
  layout.desks.forEach((d, i) => {
    drawSprite(ctx, sprites, 'monitor', monitorFrame(byDesk.get(i)), d.x * T, d.y * T - 10);
  });
  // Y-sorted: actors and chairs; a chair at the same row draws after the actor so its back covers the legs.
  const items = [
    ...layout.desks.map((d) => ({ y: d.seat[1] * T + 0.5, draw: () => drawSprite(ctx, sprites, 'chair', 0, d.seat[0] * T, d.seat[1] * T) })),
    ...[...actors.values()].map((a) => ({
      y: a.px.y,
      draw: () => drawSprite(ctx, sprites, `char:${a.view.key}`, a.frame, a.px.x, a.px.y - 8, { flip: a.flip, w: 16, h: 24 }),
    })),
  ];
  items.sort((a, b) => a.y - b.y).forEach((it) => it.draw());
}
