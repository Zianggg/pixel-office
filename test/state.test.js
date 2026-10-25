import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createState, reduce, tick, keyFor } from '../lib/state.js';
import { bubbleText } from '../lib/labels.js';

const layout = JSON.parse(readFileSync(new URL('../public/layout.json', import.meta.url), 'utf8'));
const QA = 'unity-qa-tester';
const ev = (o) => ({ t: 1000, ev: 'PreToolUse', session: 's', agentId: null, agentType: null, tool: null,
  toolUseId: null, detail: '', ok: null, waiting: false, finalReport: null, ...o });
const run = (events, s = createState(layout)) => events.reduce((st, e) => reduce(st, e, layout), s);

test('createState has every layout agent idle', () => {
  const s = createState(layout);
  assert.equal(Object.keys(s.agents).length, 9);
  assert.equal(s.agents.__main__.status, 'idle');
  assert.equal(s.agents[QA].desk, 6);
  assert.deepEqual(s.totals, { tools: 0, done: 0, started: 0 });
});

test('keyFor maps main thread and director to __main__', () => {
  assert.equal(keyFor(ev({})), '__main__');
  assert.equal(keyFor(ev({ agentType: 'unity-game-director' })), '__main__');
  assert.equal(keyFor(ev({ agentType: QA })), QA);
});

test('SubagentStart puts the agent to work', () => {
  const s = run([ev({ ev: 'SubagentStart', agentId: 'a1', agentType: QA, t: 500 })]);
  const a = s.agents[QA];
  assert.equal(a.status, 'working');
  assert.equal(a.instances, 1);
  assert.equal(a.startedAt, 500);
  assert.equal(s.totals.started, 1);
});

test('reduce does not mutate its input', () => {
  const s0 = createState(layout);
  const before = JSON.stringify(s0);
  reduce(s0, ev({ ev: 'SubagentStart', agentId: 'a1', agentType: QA }), layout);
  assert.equal(JSON.stringify(s0), before);
});

test('parallel instances are counted and only the last stop finishes', () => {
  const start = (id) => ev({ ev: 'SubagentStart', agentId: id, agentType: QA });
  const stop = (id) => ev({ ev: 'SubagentStop', agentId: id, agentType: QA, t: 2000, finalReport: 'Đã test xong' });
  let s = run([start('a1'), start('a2')]);
  assert.equal(s.agents[QA].instances, 2);
  assert.equal(s.totals.started, 1);
  s = run([stop('a1')], s);
  assert.equal(s.agents[QA].status, 'working');
  assert.equal(s.agents[QA].instances, 1);
  s = run([stop('a2')], s);
  assert.equal(s.agents[QA].status, 'done');
  assert.equal(s.agents[QA].instances, 0);
  assert.equal(s.agents[QA].endedAt, 2000);
  assert.equal(s.agents[QA].finalReport, 'Đã test xong');
  assert.equal(s.totals.done, 1);
});

test('PreToolUse sets the bubble and appends to a log capped at 50', () => {
  const e = ev({ agentId: 'a1', agentType: QA, tool: 'Edit', detail: 'Player.cs' });
  let s = run([e]);
  assert.equal(s.agents[QA].bubble, bubbleText(e));
  assert.equal(s.agents[QA].log.length, 1);
  const many = Array.from({ length: 60 }, (_, i) => ev({ agentId: 'a1', agentType: QA, tool: 'Read', detail: `f${i}.cs`, t: i }));
  s = run(many);
  assert.equal(s.agents[QA].log.length, 50);
  assert.equal(s.agents[QA].log[49].detail, 'f59.cs');
  assert.equal(s.agents[QA].log[0].detail, 'f10.cs');
});

test('PostToolUse counts tools and marks the log entry ok', () => {
  const s = run([
    ev({ agentId: 'a1', agentType: QA, tool: 'Bash', toolUseId: 'u1' }),
    ev({ ev: 'PostToolUse', agentId: 'a1', agentType: QA, tool: 'Bash', toolUseId: 'u1', ok: true }),
  ]);
  assert.equal(s.agents[QA].toolCount, 1);
  assert.equal(s.totals.tools, 1);
  assert.equal(s.agents[QA].log[0].ok, true);
});

test('failure shows error for 5 seconds then returns to working', () => {
  let s = run([
    ev({ ev: 'SubagentStart', agentId: 'a1', agentType: QA, t: 0 }),
    ev({ ev: 'PostToolUseFailure', agentId: 'a1', agentType: QA, tool: 'Bash', ok: false, detail: 'Exit code 1', t: 1000 }),
  ]);
  assert.equal(s.agents[QA].status, 'error');
  assert.equal(s.agents[QA].errorUntil, 6000);
  assert.equal(s.agents[QA].bubble, 'Lỗi: Exit code 1');
  assert.equal(tick(s, 5999).agents[QA].status, 'error');
  s = tick(s, 6001);
  assert.equal(s.agents[QA].status, 'working');
  assert.equal(s.agents[QA].errorUntil, null);
});

test('waiting notification then next tool resumes working', () => {
  let s = run([ev({ ev: 'Notification', agentId: 'a1', agentType: QA, waiting: true })]);
  assert.equal(s.agents[QA].status, 'waiting');
  assert.equal(s.agents[QA].bubble, 'Chờ sếp duyệt…');
  s = run([ev({ agentId: 'a1', agentType: QA, tool: 'Read', detail: 'x' })], s);
  assert.equal(s.agents[QA].status, 'working');
});

test('non-waiting notification changes nothing', () => {
  const s = run([ev({ ev: 'Notification', waiting: false, detail: 'idle' })]);
  assert.equal(s.agents.__main__.status, 'idle');
});

test('done becomes idle after 60 seconds', () => {
  let s = run([
    ev({ ev: 'SubagentStart', agentId: 'a1', agentType: QA, t: 0 }),
    ev({ ev: 'SubagentStop', agentId: 'a1', agentType: QA, t: 1000 }),
  ]);
  assert.equal(tick(s, 61000).agents[QA].status, 'done');
  assert.equal(tick(s, 61001).agents[QA].status, 'idle');
});

test('agent stuck working for 10 minutes goes idle', () => {
  const s = run([ev({ ev: 'SubagentStart', agentId: 'a1', agentType: QA, t: 0 })]);
  assert.equal(tick(s, 10 * 60 * 1000).agents[QA].status, 'working');
  const s2 = tick(s, 10 * 60 * 1000 + 1);
  assert.equal(s2.agents[QA].status, 'idle');
  assert.equal(s2.agents[QA].instances, 0);
  assert.deepEqual(s2.activeIds, {});
});

test('tick returns the same object when nothing changes', () => {
  const s = createState(layout);
  assert.equal(tick(s, 123), s);
});

test('unknown agent types take spare desks, then the guest spot', () => {
  const s = run([
    ev({ ev: 'SubagentStart', agentId: 'x1', agentType: 'my-agent' }),
    ev({ ev: 'SubagentStart', agentId: 'x2', agentType: 'other-agent' }),
    ev({ ev: 'SubagentStart', agentId: 'x3', agentType: 'third-agent' }),
  ]);
  assert.equal(s.agents['my-agent'].desk, 9);
  assert.equal(s.agents['other-agent'].desk, 10);
  assert.equal(s.agents['third-agent'].desk, -1);
  assert.equal(s.agents['my-agent'].name, 'my-agent');
});

test('main thread tools and Stop drive the boss', () => {
  let s = run([ev({ tool: 'Read', detail: 'CLAUDE.md', t: 10 })]);
  assert.equal(s.agents.__main__.status, 'working');
  assert.equal(s.agents.__main__.startedAt, 10);
  s = run([ev({ ev: 'Stop', t: 20 })], s);
  assert.equal(s.agents.__main__.status, 'done');
  assert.equal(s.agents.__main__.endedAt, 20);
});

test('a waiting notification without agent fields goes to the agent with an open tool call', () => {
  const s = run([
    ev({ ev: 'SubagentStart', agentId: 'a1', agentType: QA, t: 1 }),
    ev({ agentId: 'a1', agentType: QA, tool: 'Bash', toolUseId: 'u1', detail: 'touch x', t: 2 }),
    ev({ ev: 'Notification', waiting: true, detail: 'Claude needs your permission', t: 3 }),
  ]);
  assert.equal(s.agents[QA].status, 'waiting');
  assert.equal(s.agents.__main__.status, 'idle');
});

test('a waiting notification falls back to the boss when no tool call is open', () => {
  const s = run([
    ev({ agentId: 'a1', agentType: QA, tool: 'Bash', toolUseId: 'u1', t: 1 }),
    ev({ ev: 'PostToolUse', agentId: 'a1', agentType: QA, tool: 'Bash', toolUseId: 'u1', t: 2 }),
    ev({ ev: 'Notification', waiting: true, t: 3 }),
  ]);
  assert.equal(s.agents.__main__.status, 'waiting');
  assert.equal(s.agents[QA].status, 'working');
});
