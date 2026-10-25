import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
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
    assert.equal(body.layout.cols, 26);
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
