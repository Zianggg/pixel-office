// Wires state (REST + SSE), the 12 fps render loop, clicks and the panel together.
import { buildGrid } from './path.js';
import { Actor, pickActor } from './actors.js';
import { loadSprites, addAgentSprite, actorMeta, opaqueAt } from './sprites.js';
import { drawStatic, drawDynamic } from './room.js';
import { drawOverlay, drawWhiteboardText } from './overlay.js';
import { glowSources, sunBeams, drawGlow } from './glow.js';
import { fitScale } from './scale.js';
import { renderTopBar, openPanel, closePanel } from './panel.js';

// Room size in pixels; set from layout.json (cols × tile, rows × tile) once it loads.
let W = 320;
let H = 180;
const FRAME_MS = 1000 / 12;
const BACKOFF = [1000, 2000, 4000, 8000, 10000];

const world = document.getElementById('world');
const overlay = document.getElementById('overlay');
const stage = document.getElementById('stage');
const topbar = document.getElementById('topbar');
const panel = document.getElementById('panel');
const wctx = world.getContext('2d');
const octx = overlay.getContext('2d');

let layout;
let grid;
let sprites;
let state;
let hooksOn = false;
let connected = false;
let scale = 1;
const actors = new Map();
const bubbles = new Map();
const background = document.createElement('canvas');

function syncActors(now) {
  for (const view of Object.values(state.agents)) {
    let actor = actors.get(view.key);
    if (!actor) {
      const cfg = layout.agents.find((a) => a.type === view.key) ?? { shirt: 'grey', hair: 'dark', pants: 'charcoal' };
      addAgentSprite(sprites, view.key, cfg);
      actor = new Actor(view, layout, grid, Math.random, actors);
      actors.set(view.key, actor);
    }
    actor.sync(view, now);
    const prev = bubbles.get(view.key);
    if (!prev || prev.text !== view.bubble) bubbles.set(view.key, { text: view.bubble, since: now });
  }
}

function refreshPanel(now) {
  const key = panel.dataset.key;
  if (!panel.hidden && key && state.agents[key]) openPanel(panel, state.agents[key], now);
}

function refreshTopBar() {
  const working = Object.values(state.agents).filter((a) => a.status === 'working').length;
  renderTopBar(topbar, { hooksOn, connected, totals: state.totals, working });
}

function applyState(next) {
  state = next;
  const now = Date.now();
  syncActors(now);
  refreshTopBar();
  refreshPanel(now);
}

async function fetchState() {
  const body = await (await fetch('/api/state')).json();
  hooksOn = body.hooksOn;
  return body;
}

function connect(attempt = 0) {
  const es = new EventSource('/events');
  es.onopen = async () => {
    attempt = 0;
    connected = true;
    try {
      applyState((await fetchState()).state);
    } catch {
      refreshTopBar();
    }
  };
  es.addEventListener('event', (e) => {
    const { agent, totals } = JSON.parse(e.data);
    applyState({ ...state, agents: { ...state.agents, [agent.key]: agent }, totals });
  });
  es.addEventListener('state', (e) => applyState(JSON.parse(e.data)));
  es.onerror = () => {
    es.close();
    connected = false;
    refreshTopBar();
    setTimeout(() => connect(attempt + 1), BACKOFF[Math.min(attempt, BACKOFF.length - 1)]);
  };
}

function resize() {
  scale = fitScale(window.innerWidth - 16, window.innerHeight - topbar.offsetHeight - 16, W, H);
  stage.style.width = `${W * scale}px`;
  stage.style.height = `${H * scale}px`;
  const dpr = window.devicePixelRatio || 1;
  overlay.width = Math.round(W * scale * dpr);
  overlay.height = Math.round(H * scale * dpr);
}

let last = performance.now();
let timer = null;
function frame() {
  timer = null;
  if (document.hidden) return;
  const t = performance.now();
  const dt = Math.min(250, t - last);
  last = t;
  const now = Date.now();
  for (const a of actors.values()) a.update(dt);
  wctx.imageSmoothingEnabled = false;
  wctx.drawImage(background, 0, 0);
  drawDynamic(wctx, layout, sprites, state, actors);
  if (sprites.palette) drawGlow(wctx, glowSources(layout, state, sprites.palette, t), sunBeams(layout, sprites.palette), t);
  const s = scale * (window.devicePixelRatio || 1);
  const k = layout.tile / 16;
  drawOverlay(octx, s, actors, state, now, sprites, bubbles, k);
  drawWhiteboardText(octx, s, layout, state.totals, k);
  timer = setTimeout(frame, FRAME_MS);
}

function startLoop() {
  // visibilitychange can fire while the page is still loading; wait until the first state is in.
  if (!state) return;
  if (timer === null && !document.hidden) {
    last = performance.now();
    timer = setTimeout(frame, FRAME_MS);
  }
}

function actorAt(clientX, clientY) {
  const r = overlay.getBoundingClientRect();
  const x = ((clientX - r.left) / r.width) * W;
  const y = ((clientY - r.top) / r.height) * H;
  const T = layout.tile;
  const shown = (a) => `${a.sprite.sheet}:${a.view.key}`;
  return pickActor(actors.values(), x, y, (a) => actorMeta(sprites, a.view.key, a.sprite.sheet, T), (a, lx, ly) => opaqueAt(sprites, shown(a), a.sprite.frame, a.sprite.flip, lx, ly));
}

overlay.addEventListener('click', (e) => {
  const a = actorAt(e.clientX, e.clientY);
  if (a && state.agents[a.view.key]) openPanel(panel, state.agents[a.view.key], Date.now());
  else closePanel(panel);
});
overlay.addEventListener('mousemove', (e) => {
  overlay.style.cursor = actorAt(e.clientX, e.clientY) ? 'pointer' : 'default';
});
panel.addEventListener('click', (e) => {
  if (e.target.closest('.close')) closePanel(panel);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closePanel(panel);
});
document.addEventListener('visibilitychange', startLoop);
window.addEventListener('resize', resize);
setInterval(async () => {
  if (document.hidden || !connected) return;
  try {
    await fetchState();
    refreshTopBar();
  } catch {}
}, 30000);

const initial = await fetchState().catch(() => null);
if (!initial) {
  topbar.textContent = 'Không kết nối được server văn phòng — chạy "office on" rồi tải lại trang.';
} else {
  layout = initial.layout;
  W = layout.cols * layout.tile;
  H = layout.rows * layout.tile;
  world.width = background.width = W;
  world.height = background.height = H;
  grid = buildGrid(layout);
  sprites = await loadSprites('art/');
  drawStatic(background.getContext('2d'), layout, sprites);
  resize();
  applyState(initial.state);
  connected = true;
  refreshTopBar();
  connect();
  startLoop();
}
