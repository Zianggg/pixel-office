// Character movement, animation frames and palette recoloring. No DOM at import time.
import { findPath } from './path.js';

export const FRAMES = { down: 0, up: 1, walkDown1: 2, walkDown2: 3, walkSide1: 4, walkSide2: 5, type1: 6, type2: 7 };

// Accessory sheets hold 3 views: 0 front, 1 back, 2 side — indexed by character frame.
const ACC_VIEW = [0, 1, 0, 0, 2, 2, 1, 1];

export function accFrame(charFrame, accFrames) {
  const view = ACC_VIEW[charFrame] ?? 0;
  return view < accFrames ? view : 0;
}

const SPEED = 2 / 1000; // tiles per ms
const STEP_ANIM_MS = 200;
const TYPE_ANIM_MS = 250;
const WORK = new Set(['working', 'waiting', 'error']);

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
    this.typeClock = 0;
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

  update(dtMs, rand = this.rand) {
    if (this.path.length) {
      this.walkClock += dtMs;
      let budget = dtMs * SPEED;
      while (budget > 0 && this.path.length) {
        const [nx, ny] = this.path[0];
        const dx = nx - this.x;
        const dy = ny - this.y;
        const dist = Math.abs(dx) + Math.abs(dy);
        if (dx !== 0) {
          this.dir = 'side';
          this.flip = dx < 0;
        } else if (dy !== 0) {
          this.dir = dy > 0 ? 'down' : 'up';
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
    if (this.working) {
      this.typeClock += dtMs;
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

  get frame() {
    if (this.seated) {
      if (this.view.status !== 'working') return FRAMES.type1;
      return Math.floor(this.typeClock / TYPE_ANIM_MS) % 2 ? FRAMES.type2 : FRAMES.type1;
    }
    if (this.path.length) {
      const alt = Math.floor(this.walkClock / STEP_ANIM_MS) % 2;
      if (this.dir === 'side') return alt ? FRAMES.walkSide2 : FRAMES.walkSide1;
      if (this.dir === 'up') return FRAMES.up;
      return alt ? FRAMES.walkDown2 : FRAMES.walkDown1;
    }
    return FRAMES.down;
  }

  get px() {
    const T = this.layout.tile;
    return { x: Math.round(this.x * T), y: Math.round(this.y * T) };
  }
}
