import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { createOfficeServer } from '../server.js';

const root = path.dirname(fileURLToPath(import.meta.url)) + '/..';
const layout = JSON.parse(readFileSync(path.join(root, 'public/layout.json'), 'utf8'));
const tmp = () => mkdtempSync(path.join(tmpdir(), 'office-srv-'));
const start = (dataDir = tmp()) => createOfficeServer({
  dataDir, publicDir: path.join(root, 'public'), layout, projectDir: tmp(), port: 0,
});
const post = (port, body) => fetch(`http://127.0.0.1:${port}/hook`, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: typeof body === 'string' ? body : JSON.stringify(body),
});
const startPayload = { hook_event_name: 'SubagentStart', session_id: 's', agent_id: 'a1', agent_type: 'unity-qa-tester' };

test('POST /hook updates /api/state', async () => {
  const srv = await start();
  try {
    const res = await post(srv.port, startPayload);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), {});
    const body = await (await fetch(`http://127.0.0.1:${srv.port}/api/state`)).json();
    assert.equal(body.state.agents['unity-qa-tester'].status, 'working');
    assert.equal(body.layout.cols, 36);
    assert.equal(body.hooksOn, false);
    assert.equal(body.events, 1);
  } finally {
    await srv.close();
  }
});

test('corrupt or empty payloads still answer 200', async () => {
  const srv = await start();
  try {
    assert.equal((await post(srv.port, '{hỏng')).status, 200);
    assert.equal((await post(srv.port, {})).status, 200);
    const body = await (await fetch(`http://127.0.0.1:${srv.port}/api/state`)).json();
    assert.equal(body.events, 0);
  } finally {
    await srv.close();
  }
});

test('SSE pushes summarized events', async () => {
  const srv = await start();
  const ac = new AbortController();
  try {
    const res = await fetch(`http://127.0.0.1:${srv.port}/events`, { signal: ac.signal });
    assert.equal(res.headers.get('content-type'), 'text/event-stream');
    const reader = res.body.getReader();
    await post(srv.port, startPayload);
    let text = '';
    while (!text.includes('event: event')) text += new TextDecoder().decode((await reader.read()).value);
    const data = JSON.parse(text.split('event: event\ndata: ')[1].split('\n')[0]);
    assert.equal(data.ev.agentType, 'unity-qa-tester');
    assert.equal(data.agent.key, 'unity-qa-tester');
    assert.equal(data.agent.status, 'working');
    assert.equal(data.totals.started, 1);
  } finally {
    ac.abort();
    await srv.close();
  }
});

test('static files are served and traversal is blocked', async () => {
  const srv = await start();
  try {
    const ok = await fetch(`http://127.0.0.1:${srv.port}/layout.json`);
    assert.equal(ok.status, 200);
    assert.equal(ok.headers.get('content-type'), 'application/json; charset=utf-8');
    const bad = await fetch(`http://127.0.0.1:${srv.port}/..%2Fpackage.json`);
    assert.equal(bad.status, 404);
    assert.equal((await fetch(`http://127.0.0.1:${srv.port}/nope.js`)).status, 404);
  } finally {
    await srv.close();
  }
});

test('state is rebuilt from the log on restart', async () => {
  const dataDir = tmp();
  const a = await start(dataDir);
  await post(a.port, startPayload);
  await a.close();
  const b = await start(dataDir);
  try {
    const body = await (await fetch(`http://127.0.0.1:${b.port}/api/state`)).json();
    assert.equal(body.state.agents['unity-qa-tester'].status, 'working');
  } finally {
    await b.close();
  }
});

test('debugRaw appends every raw hook payload to raw.jsonl; off by default', async () => {
  const dir = tmp();
  const srv = await createOfficeServer({
    dataDir: dir, publicDir: path.join(root, 'public'), layout, projectDir: tmp(), port: 0, debugRaw: true,
  });
  try {
    await post(srv.port, { ...startPayload, extra: 'kept as is' });
    const lines = readFileSync(path.join(dir, 'raw.jsonl'), 'utf8').trim().split('\n');
    assert.equal(lines.length, 1);
    assert.equal(JSON.parse(lines[0]).extra, 'kept as is');
  } finally {
    await srv.close();
  }
  const quiet = tmp();
  const srv2 = await start(quiet);
  try {
    await post(srv2.port, startPayload);
    assert.equal(existsSync(path.join(quiet, 'raw.jsonl')), false);
  } finally {
    await srv2.close();
  }
});

// Raw requests so tests can set Host / Origin (fetch forbids overriding Host).
const raw = (port, { method = 'GET', path: p = '/api/state', headers = {}, body = '' } = {}) => new Promise((resolve, reject) => {
  const req = http.request({ host: '127.0.0.1', port, method, path: p, headers }, (res) => {
    res.resume();
    res.on('end', () => resolve(res.statusCode));
  });
  req.on('error', reject);
  req.end(body);
});

const readEvents = async (reader, n) => {
  let text = '';
  const dec = new TextDecoder();
  while (text.split('event: event\n').length - 1 < n) text += dec.decode((await reader.read()).value);
  return text.split('event: event\ndata: ').slice(1).map((chunk) => JSON.parse(chunk.split('\n')[0]));
};

test('C1: a real agent-less permission Notification is broadcast on the agent that is waiting', async () => {
  const srv = await start();
  const ac = new AbortController();
  try {
    const res = await fetch(`http://127.0.0.1:${srv.port}/events`, { signal: ac.signal });
    const reader = res.body.getReader();
    await post(srv.port, startPayload);
    await post(srv.port, { ...startPayload, hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'touch x' }, tool_use_id: 'u1' });
    await post(srv.port, { session_id: 's', cwd: 'E:\\UnityProject', hook_event_name: 'Notification', message: 'Claude needs your permission', notification_type: 'permission_prompt' });
    const events = await readEvents(reader, 3);
    assert.equal(events[2].agent.key, 'unity-qa-tester');
    assert.equal(events[2].agent.status, 'waiting');
  } finally {
    ac.abort();
    await srv.close();
  }
});

test('I1: hostile agent_type / tool_name values neither crash the server nor poison a restart', async () => {
  const dir = tmp();
  const srv = await start(dir);
  try {
    for (const agent_type of ['constructor', '__proto__', 'toString']) {
      const res = await post(srv.port, { ...startPayload, hook_event_name: 'PreToolUse', agent_type, tool_name: 'Read', tool_input: {} });
      assert.equal(res.status, 200);
    }
    assert.equal((await post(srv.port, { ...startPayload, hook_event_name: 'PreToolUse', tool_name: 42 })).status, 200);
    assert.equal((await post(srv.port, { ...startPayload, agent_type: { x: 1 } })).status, 200);
    assert.equal((await fetch(`http://127.0.0.1:${srv.port}/api/state`)).status, 200);
  } finally {
    await srv.close();
  }
  const again = await start(dir);
  try {
    assert.equal((await fetch(`http://127.0.0.1:${again.port}/api/state`)).status, 200);
  } finally {
    await again.close();
  }
});

test('I2: requests with a foreign Host or a foreign Origin are refused', async () => {
  const srv = await start();
  try {
    const port = srv.port;
    assert.equal(await raw(port, { headers: { host: `127.0.0.1:${port}` } }), 200);
    assert.equal(await raw(port, { headers: { host: `localhost:${port}` } }), 200);
    assert.equal(await raw(port, { headers: { host: `evil.example:${port}` } }), 403);
    assert.equal(await raw(port, { method: 'POST', path: '/shutdown', headers: { host: `127.0.0.1:${port}`, origin: 'http://evil.example' } }), 403);
    assert.equal(await raw(port, { method: 'POST', path: '/hook', headers: { host: `127.0.0.1:${port}`, origin: 'http://evil.example', 'content-type': 'application/json' }, body: JSON.stringify(startPayload) }), 403);
    assert.equal(await raw(port, { headers: { host: `127.0.0.1:${port}` } }), 200, 'server must still be up');
    const state = await (await fetch(`http://127.0.0.1:${port}/api/state`)).json();
    assert.equal(state.state.agents['unity-qa-tester'].status, 'idle', 'foreign-origin hook must not be applied');
  } finally {
    await srv.close();
  }
});
