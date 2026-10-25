// Wires state (REST + SSE), the 12 fps render loop, clicks and the panel together.
import { buildGrid } from './path.js';
import { Actor } from './actors.js';
import { loadSprites, addAgentSprite } from './sprites.js';
import { drawStatic, drawDynamic } from './room.js';
import { drawOverlay, drawWhiteboardText } from './overlay.js';
import { renderTopBar, openPanel, closePanel } from './panel.js';

const W = 320;
const H = 180;
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
background.width = W;
background.height = H;

function syncActors(now) {
  for (const view of Object.values(state.agents)) {
    let actor = actors.get(view.key);
    if (!actor) {
      const cfg = layout.agents.find((a) => a.type === view.key) ?? { shirt: 'grey', hair: 'dark', acc: null };
      addAgentSprite(sprites, view.key, cfg);
      actor = new Actor(view, layout, grid);
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
  const avail = Math.min(window.innerWidth / W, (window.innerHeight - topbar.offsetHeight - 16) / H);
  scale = Math.max(1, Math.floor(avail));
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
  const s = scale * (window.devicePixelRatio || 1);
  drawOverlay(octx, s, actors, state, now, sprites, bubbles);
  drawWhiteboardText(octx, s, layout, state.totals);
  timer = setTimeout(frame, FRAME_MS);
}

function startLoop() {
  if (timer === null && !document.hidden) {
    last = performance.now();
    timer = setTimeout(frame, FRAME_MS);
  }
}

function actorAt(clientX, clientY) {
  const r = overlay.getBoundingClientRect();
  const x = ((clientX - r.left) / r.width) * W;
  const y = ((clientY - r.top) / r.height) * H;
  return [...actors.values()].reverse().find((a) => x >= a.px.x && x < a.px.x + 16 && y >= a.px.y - 8 && y < a.px.y + 16);
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
