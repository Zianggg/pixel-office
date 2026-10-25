// Pure reducer: folds OfficeEvents into per-agent views.
import { bubbleText } from './labels.js';

const LOG_MAX = 50;
const ERROR_MS = 5000;
const DONE_TO_IDLE_MS = 60 * 1000;
const STALE_MS = 10 * 60 * 1000;
const STALE_OPEN_TOOL_MS = 60 * 60 * 1000;
const MAIN = '__main__';

export function keyFor(ev) {
  if (!ev.agentType || ev.agentType === 'unity-game-director') return MAIN;
  return ev.agentType;
}

function newAgent(key, name, role, desk) {
  return {
    key, name, role, desk,
    status: 'idle', instances: 0, bubble: '', toolCount: 0,
    startedAt: null, endedAt: null, lastEventAt: null, errorUntil: null,
    finalReport: null, log: [],
  };
}

export function createState(layout) {
  const agents = {};
  for (const a of layout.agents) agents[a.type] = newAgent(a.type, a.name, a.role, a.desk);
  return { agents, totals: { tools: 0, done: 0, started: 0 }, activeIds: {} };
}

function freeSpareDesk(state, layout) {
  const used = new Set(Object.values(state.agents).map((a) => a.desk));
  const i = layout.desks.findIndex((d, idx) => d.spare && !used.has(idx));
  return i;
}

function countInstances(state, key) {
  return Object.values(state.activeIds).filter((k) => k === key).length;
}

function startWork(a, t) {
  if (a.status === 'idle' || a.status === 'done' || a.startedAt === null) {
    a.startedAt = t;
    a.endedAt = null;
    a.finalReport = null;
  }
  a.status = 'working';
}

function markLog(a, toolUseId, ok) {
  if (!toolUseId) return;
  const entry = a.log.findLast((l) => l.toolUseId === toolUseId);
  if (entry) entry.ok = ok;
}

// Real permission Notifications carry no agent_id even when a subagent asked, so blame whoever
// has the newest tool call still waiting for its Post event.
function openToolOwner(state) {
  let best = null;
  for (const a of Object.values(state.agents)) {
    const last = a.log.at(-1);
    if (last && last.ok === null && (!best || last.t > best.t)) best = { key: a.key, t: last.t };
  }
  return best?.key ?? null;
}

// Agent key an event lands on; the server uses it too so SSE pushes the agent that actually changed.
export function resolveKey(state, ev) {
  const key = keyFor(ev);
  if (ev.ev === 'Notification' && ev.waiting && !ev.agentType) return openToolOwner(state) ?? key;
  return key;
}

// Keys come from payloads, so set them as own data properties ('__proto__', 'constructor' are just names).
function put(obj, key, value) {
  Object.defineProperty(obj, key, { value, enumerable: true, writable: true, configurable: true });
}

export function reduce(state, ev, layout) {
  const s = structuredClone(state);
  const key = resolveKey(s, ev);
  if (!Object.hasOwn(s.agents, key)) put(s.agents, key, newAgent(key, ev.agentType, 'Agent khác', freeSpareDesk(s, layout)));
  const a = s.agents[key];
  a.lastEventAt = ev.t;

  switch (ev.ev) {
    case 'SubagentStart':
      if (a.instances === 0) s.totals.started += 1;
      if (ev.agentId) put(s.activeIds, ev.agentId, key);
      a.instances = countInstances(s, key);
      startWork(a, ev.t);
      a.bubble = bubbleText(ev);
      break;
    case 'PreToolUse':
      startWork(a, ev.t);
      a.bubble = bubbleText(ev);
      a.log.push({ t: ev.t, tool: ev.tool, detail: ev.detail, ok: null, toolUseId: ev.toolUseId });
      if (a.log.length > LOG_MAX) a.log.splice(0, a.log.length - LOG_MAX);
      break;
    case 'PostToolUse':
      if (a.status === 'waiting' || a.status === 'idle') startWork(a, ev.t);
      a.toolCount += 1;
      s.totals.tools += 1;
      markLog(a, ev.toolUseId, true);
      break;
    case 'PostToolUseFailure':
      a.toolCount += 1;
      s.totals.tools += 1;
      markLog(a, ev.toolUseId, false);
      a.status = 'error';
      a.errorUntil = ev.t + ERROR_MS;
      a.bubble = bubbleText(ev);
      break;
    case 'Notification':
      if (ev.waiting) {
        a.status = 'waiting';
        a.bubble = bubbleText(ev);
      }
      break;
    case 'SubagentStop':
      if (ev.agentId) delete s.activeIds[ev.agentId];
      a.instances = countInstances(s, key);
      if (ev.finalReport) a.finalReport = ev.finalReport;
      if (a.instances === 0) {
        a.status = 'done';
        a.endedAt = ev.t;
        a.bubble = bubbleText(ev);
        s.totals.done += 1;
      }
      break;
    case 'Stop':
      if (key === MAIN) {
        a.status = 'done';
        a.endedAt = ev.t;
        a.bubble = bubbleText(ev);
      }
      break;
  }
  return s;
}

// A tool call still open (e.g. a long Unity build) gets an hour before the agent is assumed lost.
function staleAfter(a) {
  return a.log.at(-1)?.ok === null ? STALE_OPEN_TOOL_MS : STALE_MS;
}

export function tick(state, now) {
  let s = null;
  const edit = () => (s ??= structuredClone(state));
  for (const key of Object.keys(state.agents)) {
    const a = state.agents[key];
    if (a.status === 'error' && a.errorUntil !== null && now > a.errorUntil) {
      Object.assign(edit().agents[key], { status: 'working', errorUntil: null });
    } else if (a.status === 'done' && now - (a.lastEventAt ?? 0) > DONE_TO_IDLE_MS) {
      Object.assign(edit().agents[key], { status: 'idle', bubble: '' });
    } else if ((a.status === 'working' || a.status === 'waiting') && now - (a.lastEventAt ?? 0) > staleAfter(a)) {
      const st = edit();
      Object.assign(st.agents[key], { status: 'idle', instances: 0, bubble: '' });
      for (const [id, k] of Object.entries(st.activeIds)) if (k === key) delete st.activeIds[id];
    }
  }
  return s ?? state;
}
