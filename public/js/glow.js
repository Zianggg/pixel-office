// Light pass: sunlight through the windows, screen glow, pc LEDs. Pure source math + a banded additive renderer.
// Offsets are authored for 16px tiles; k = tile / 16 scales them.
import { monitorPos, deskKits } from './desks.js';
import { roomAt } from './path.js';

export { monitorPos };

const LIT = new Set(['working', 'waiting']);

function windows(layout) {
  return layout.props.filter((p) => p.sprite.startsWith('window'));
}

// One short beam per window: from the glass width at its room's floor line, slanting a little down-right.
export function sunBeams(layout, palette) {
  const T = layout.tile;
  const k = T / 16;
  return windows(layout).map((w) => {
    const r = roomAt(layout, w.x, w.y);
    const floor = (r.y + r.wallRows) * T;
    const left = w.x * T + 6 * k;
    const right = (w.x + w.w) * T - 6 * k;
    return {
      top: { x0: left, x1: right, y: floor },
      bottom: { x0: left + 4 * k, x1: right + 8 * k, y: floor + 0.75 * T },
      color: palette.colors.sun,
    };
  });
}

export function glowSources(layout, state, palette, t) {
  const T = layout.tile;
  const k = T / 16;
  const c = palette.colors;
  const out = [];
  for (const w of windows(layout)) {
    out.push({ kind: 'sun', x: (w.x + w.w / 2) * T, y: (w.y + w.h / 2) * T, r: 14 * k, color: c.sunGlow, alpha: 0.4 });
  }
  const byDesk = new Map(Object.values(state.agents).map((a) => [a.desk, a]));
  const kits = deskKits(layout);
  layout.desks.forEach((desk, i) => {
    const agent = byDesk.get(i);
    const m = monitorPos(desk, T);
    const screen = { x: m.x + 8 * k, y: m.y + 5 * k, r: 14 * k };
    if (agent && agent.status === 'error') {
      const flicker = Math.floor(t / 180) % 2 ? 0.45 : 0.3;
      out.push({ kind: 'monitor', ...screen, color: c.screenErr, alpha: flicker });
    } else if (agent && LIT.has(agent.status)) {
      const pulse = agent.status === 'working' ? 0.32 + 0.08 * Math.sin(t / 260) : 0.24;
      out.push({ kind: 'monitor', ...screen, color: c.screenOn, alpha: pulse });
    }
    if (!kits[i]) out.push({ kind: 'led', x: (desk.x + desk.w - 1) * T + 9 * k, y: desk.y * T + 5 * k, r: 3 * k, color: c.screenOn, alpha: 0.6 });
  });
  return out;
}

export function lampGlowColor(status, palette) {
  const c = palette.colors;
  return { working: c.lampGreen, done: c.lampGreen, waiting: c.lampYellow, error: c.lampRed }[status] ?? null;
}

// Pixel-art glow: three hard-edged rings instead of a smooth gradient, cached per color+radius.
const cache = new Map();
function glowSprite(color, r) {
  const key = `${color}|${r}`;
  let c = cache.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = c.height = r * 2 + 1;
  const g = c.getContext('2d');
  g.fillStyle = color;
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      const d = Math.hypot(x, y) / r;
      if (d > 1) continue;
      g.globalAlpha = d < 0.35 ? 1 : d < 0.7 ? 0.55 : 0.25;
      g.fillRect(x + r, y + r, 1, 1);
    }
  }
  cache.set(key, c);
  return c;
}

export function drawGlow(ctx, sources, beams, t) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const shimmer = 0.04 * Math.sin(t / 900);
  for (const beam of beams) {
    for (const [inset, alpha] of [[0, 0.16 + shimmer], [5, 0.14 + shimmer]]) {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = beam.color;
      ctx.beginPath();
      ctx.moveTo(beam.top.x0 + inset, beam.top.y);
      ctx.lineTo(beam.top.x1 - inset, beam.top.y);
      ctx.lineTo(beam.bottom.x1 - inset * 2, beam.bottom.y - inset);
      ctx.lineTo(beam.bottom.x0 + inset * 2, beam.bottom.y - inset);
      ctx.closePath();
      ctx.fill();
    }
  }
  for (const s of sources) {
    ctx.globalAlpha = s.alpha;
    ctx.drawImage(glowSprite(s.color, s.r), Math.round(s.x - s.r), Math.round(s.y - s.r));
  }
  ctx.restore();
}
