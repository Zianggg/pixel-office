// High-resolution overlay: status lamps, tool badges, name tags and speech bubbles.
import { drawSprite, actorMeta } from './sprites.js';
import { spriteBox } from './actors.js';
import { lampGlowColor } from './glow.js';

const BUBBLE_MS = 8000;
const BUBBLE_STATUSES = new Set(['working', 'waiting', 'error', 'done']);
const LAMP = { working: 0, waiting: 1, error: 2, idle: 3, done: 4 };

export function wrapText(ctx, text, maxWidth, maxLines) {
  const fits = (s) => ctx.measureText(s).width <= maxWidth;
  const lines = [];
  let line = '';
  const pushWord = (word) => {
    for (const ch of Array.from(word)) {
      if (!fits(line + ch)) {
        lines.push(line);
        line = '';
      }
      line += ch;
    }
  };
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (fits(candidate)) line = candidate;
    else if (fits(word)) {
      if (line) lines.push(line);
      line = word;
    } else {
      if (line) {
        lines.push(line);
        line = '';
      }
      pushWord(word);
    }
  }
  if (line) lines.push(line);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  let last = kept[maxLines - 1];
  while (last && !fits(last + '…')) last = Array.from(last).slice(0, -1).join('');
  kept[maxLines - 1] = last + '…';
  return kept;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function drawBubble(ctx, s, cx, top, text, status) {
  const font = Math.max(11, Math.round(3 * s));
  ctx.font = `bold ${font}px "Segoe UI", sans-serif`;
  const lines = wrapText(ctx, text, Math.max(130, 34 * s), 2);
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 3 * s;
  const h = lines.length * font * 1.25 + 2 * s;
  const x = Math.round(cx - w / 2);
  const y = Math.round(top - h - 2 * s);
  ctx.fillStyle = status === 'error' ? '#ffe3e0' : status === 'waiting' ? '#fff6d6' : '#f4f1ea';
  ctx.strokeStyle = '#2b1d14';
  ctx.lineWidth = Math.max(1, s / 2);
  roundRect(ctx, x, y, w, h, s);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - s, y + h);
  ctx.lineTo(cx, y + h + 2 * s);
  ctx.lineTo(cx + s, y + h);
  ctx.fill();
  ctx.fillStyle = '#2b1d14';
  ctx.textBaseline = 'top';
  lines.forEach((l, i) => ctx.fillText(l, x + 1.5 * s, y + s + i * font * 1.25));
}

function drawPill(ctx, s, x, y, text, bg) {
  ctx.font = `bold ${Math.max(10, Math.round(2.5 * s))}px "Segoe UI", sans-serif`;
  const w = ctx.measureText(text).width + 1.5 * s;
  const h = 3.5 * s;
  ctx.fillStyle = bg;
  roundRect(ctx, x, y, Math.max(w, h), h, h / 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText(text, x + Math.max(w, h) / 2, y + h / 2 + 0.5);
  ctx.textAlign = 'left';
}

function drawLampGlow(ctx, x, y, r, color) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `${color}aa`);
  g.addColorStop(1, `${color}00`);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
}

export function drawOverlay(ctx, s, actors, state, now, sprites, bubbles, k = 1) {
  const u = s * k;
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.imageSmoothingEnabled = false;
  const sorted = [...actors.values()].sort((a, b) => a.px.y - b.px.y);
  for (const actor of sorted) {
    const view = state.agents[actor.view.key];
    if (!view) continue;
    const box = spriteBox(actor.px, actorMeta(sprites, actor.view.key, actor.sprite.sheet, 16 * k));
    const cx = (box.x + box.w / 2) * s;
    const head = box.y * s;
    const feet = (box.y + box.h) * s;
    const glow = sprites.palette && lampGlowColor(view.status, sprites.palette);
    if (glow) drawLampGlow(ctx, cx, head - 4 * u, 7 * u, glow);
    drawSprite(ctx, sprites, 'lamp', LAMP[view.status] ?? 3, cx - 3 * u, head - 7 * u, { scale: s, w: 6 * k, h: 6 * k });
    if (view.toolCount > 0) drawPill(ctx, u, cx + 4 * u, head - 3 * u, String(view.toolCount), '#e0473f');
    if (view.instances > 1) drawPill(ctx, u, cx - 11 * u, head - 3 * u, `×${view.instances}`, '#3e5f9e');
    ctx.font = `bold ${Math.max(10, Math.round(2.5 * u))}px "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.lineWidth = Math.max(2, u / 1.5);
    ctx.strokeStyle = 'rgba(43,29,20,0.85)';
    ctx.strokeText(view.name, cx, feet);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(view.name, cx, feet);
    ctx.textAlign = 'left';
    const b = bubbles.get(view.key);
    if (b && BUBBLE_STATUSES.has(view.status) && now - b.since < BUBBLE_MS && b.text) {
      drawBubble(ctx, u, cx, head - 8 * u, b.text, view.status);
    }
  }
}

export function drawWhiteboardText(ctx, s, layout, totals, k = 1) {
  const T = layout.tile;
  const wb = layout.props.find((p) => p.sprite === 'whiteboard');
  if (!wb) return;
  ctx.font = `bold ${Math.max(10, Math.round(2.6 * s * k))}px "Segoe UI", sans-serif`;
  ctx.fillStyle = '#2b1d14';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`Kết quả ${totals.done}/${totals.started}`, (wb.x + wb.w / 2) * T * s, (wb.y + 0.5) * T * s);
  ctx.textAlign = 'left';
}
