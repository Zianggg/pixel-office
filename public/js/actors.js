// Character movement, animation frames and palette recoloring. No DOM at import time.
import { findPath } from './path.js';

// Stand/walk sheet (char*): 3/4 front facing down-right, 3/4 back for walking up.
export const FRAMES = { idle1: 0, idle2: 1, walk1: 2, walk2: 3, walk3: 4, walk4: 5, back: 6, walkBack1: 7, walkBack2: 8 };
// Seated sheet (sit*): the agent on its desk chair, one loop per work status.
export const SIT_FRAMES = { type1: 0, type2: 1, type3: 2, type4: 3, wait1: 4, wait2: 5, error1: 6, error2: 7 };

const SPEED = 2 / 1000; // tiles per ms
const STEP_ANIM_MS = 150;
const BREATH_MS = [600, 400];
const WALK_CYCLE = [FRAMES.walk1, FRAMES.walk2, FRAMES.walk3, FRAMES.walk4];
const BACK_CYCLE = [FRAMES.walkBack1, FRAMES.back, FRAMES.walkBack2, FRAMES.back];
// Per status: [ms per frame, frames].
const SIT_ANIM = {
  working: [180, [SIT_FRAMES.type1, SIT_FRAMES.type2, SIT_FRAMES.type3, SIT_FRAMES.type4]],
  waiting: [500, [SIT_FRAMES.wait1, SIT_FRAMES.wait2]],
  error: [300, [SIT_FRAMES.error1, SIT_FRAMES.error2]],
};
const WORK = new Set(Object.keys(SIT_ANIM));

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function recolor(rgba, map) {
  const out = new Uint8ClampedArray(rgba);
  const pairs = Object.entries(map).map(([from, to]) => [hexToRgb(from), hexToRgb(to)]);
  for (let i = 0; i < out.length; i += 4) {
    if (out[i + 3] === 0) continue;
    for (const [[r, g, b], to] of pairs) {
      if (out[i] === r && out[i + 1] === g && out[i + 2] === b) {
        [out[i], out[i + 1], out[i + 2]] = to;
        break;
      }
    }
  }
  return out;
}

// Drawn box of a sprite whose anchor is the offset from its standing tile's top-left corner.
export function spriteBox(px, meta) {
  return { x: px.x - meta.anchor[0], y: px.y - meta.anchor[1], w: meta.w, h: meta.h };
}

// The actor drawn at world point (x, y); where sprites overlap, the one drawn last (lowest on screen) wins.
// opaque(actor, lx, ly) tells whether the actor's shown sprite has a pixel at box-local (lx, ly).
export function pickActor(actors, x, y, metaFor, opaque = () => true) {
  return [...actors].sort((a, b) => b.px.y - a.px.y).find((a) => {
    const box = spriteBox(a.px, metaFor(a));
    const inside = x >= box.x && x < box.x + box.w && y >= box.y && y < box.y + box.h;
    return inside && opaque(a, x - box.x, y - box.y);
  });
}

// Key color → agent color for the shirt, hair and pants ramps; unknown ramps keep their key colors.
export function agentColorMap(palette, cfg) {
  const map = {};
  for (const [part, ramps] of [['shirt', 'shirts'], ['hair', 'hairs'], ['pants', 'pants']]) {
    const keys = palette.keys?.[part];
    const ramp = palette[ramps]?.[cfg[part]];
    if (keys && ramp) keys.forEach((k, i) => (map[k] = ramp[i]));
  }
  return map;
}

export class Actor {
  // crowd: shared Map of every actor in the room, so idle actors spread out over the wander points.
  constructor(view, layout, grid, rand = Math.random, crowd = null) {
    this.crowd = crowd;
    this.layout = layout;
    this.grid = grid;
    this.rand = rand;
    this.view = view;
    this.x = layout.spawn[0];
    this.y = layout.spawn[1];
    this.path = [];
    this.target = null;
    this.dir = 'down';
    this.flip = false;
    this.walkClock = 0;
    this.sitClock = 0;
    this.breathClock = 0;
    this.idleWait = 0;
  }

  workSpot() {
    const desk = this.layout.desks[this.view.desk];
    return desk ? desk.seat : this.layout.guest;
  }

  goTo(target) {
    this.target = target;
    const here = this.path.length ? this.path[0] : [Math.round(this.x), Math.round(this.y)];
    const rest = findPath(this.grid, here, target) ?? [here];
    this.path = this.path.length ? [here, ...rest.slice(1)] : rest.slice(1);
  }

  sync(view) {
    // A new status restarts the seated loop so it opens on that status's first frame.
    if (view.status !== this.view.status) this.sitClock = 0;
    this.view = view;
    const spot = this.workSpot();
    const headingToSpot = this.target && this.target[0] === spot[0] && this.target[1] === spot[1];
    if (WORK.has(view.status) && !headingToSpot) this.goTo(spot);
    if (!WORK.has(view.status) && headingToSpot) this.target = null;
  }

  freeWanderPoints() {
    const taken = new Set();
    for (const other of this.crowd?.values() ?? []) {
      if (other === this) continue;
      if (other.target) taken.add(`${other.target[0]},${other.target[1]}`);
      taken.add(`${Math.round(other.x)},${Math.round(other.y)}`);
    }
    const free = this.layout.wander.filter(([x, y]) => !taken.has(`${x},${y}`));
    return free.length ? free : this.layout.wander;
  }

  get working() {
    return WORK.has(this.view.status);
  }

  get seated() {
    if (!this.working || this.path.length) return false;
    const [sx, sy] = this.workSpot();
    return this.x === sx && this.y === sy;
  }

  // Seated on a desk chair (the guest spot has no chair, so an agent working there stands).
  get seatedAtDesk() {
    return this.seated && Boolean(this.layout.desks[this.view.desk]);
  }

  update(dtMs, rand = this.rand) {
    if (this.path.length) {
      this.walkClock += dtMs;
      this.breathClock = 0;
      let budget = dtMs * SPEED;
      while (budget > 0 && this.path.length) {
        const [nx, ny] = this.path[0];
        const dx = nx - this.x;
        const dy = ny - this.y;
        const dist = Math.abs(dx) + Math.abs(dy);
        if (dx !== 0) {
          this.dir = 'side';
          this.flip = dx < 0;
        } else if (dy > 0) {
          this.dir = 'down';
          this.flip = false;
        } else if (dy < 0) {
          this.dir = 'up';
        }
        if (dist <= budget) {
          this.x = nx;
          this.y = ny;
          this.path.shift();
          budget -= dist;
        } else {
          this.x += Math.sign(dx) * budget;
          this.y += Math.sign(dy) * budget;
          budget = 0;
        }
      }
      return;
    }
    this.breathClock += dtMs;
    if (this.working) {
      this.sitClock += dtMs;
      return;
    }
    this.dir = 'down';
    this.idleWait -= dtMs;
    if (this.idleWait <= 0) {
      const points = this.freeWanderPoints();
      const next = points[Math.floor(rand() * points.length) % points.length];
      this.idleWait = 3000 + rand() * 5000;
      if (next[0] !== this.x || next[1] !== this.y) this.goTo(next);
    }
  }

  // Which sheet to draw ('char' standing/walking, 'sit' on a desk chair), its frame and mirroring.
  get sprite() {
    if (this.seatedAtDesk) {
      const [ms, frames] = SIT_ANIM[this.view.status];
      return { sheet: 'sit', frame: frames[Math.floor(this.sitClock / ms) % frames.length], flip: false };
    }
    if (this.path.length) {
      const cycle = this.dir === 'up' ? BACK_CYCLE : WALK_CYCLE;
      return { sheet: 'char', frame: cycle[Math.floor(this.walkClock / STEP_ANIM_MS) % cycle.length], flip: this.flip };
    }
    const breath = this.breathClock % (BREATH_MS[0] + BREATH_MS[1]);
    return { sheet: 'char', frame: breath < BREATH_MS[0] ? FRAMES.idle1 : FRAMES.idle2, flip: this.flip };
  }

  get px() {
    const T = this.layout.tile;
    return { x: Math.round(this.x * T), y: Math.round(this.y * T) };
  }
}
