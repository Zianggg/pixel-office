import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import net from 'node:net';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const cli = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'cli.js');
const tmp = () => mkdtempSync(path.join(tmpdir(), 'office-cli-'));
const freePort = () => new Promise((resolve) => {
  const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); });
});
const runCli = (args, port, dataDir) => spawnSync(process.execPath, [cli, ...args], {
  encoding: 'utf8', timeout: 20000,
  env: { ...process.env, OFFICE_PORT: String(port), OFFICE_DATA: dataDir, OFFICE_NO_BROWSER: '1' },
});

test('on refuses when the port is taken by something else and leaves settings alone', async () => {
  const blocker = net.createServer().listen(0, '127.0.0.1');
  await new Promise((r) => blocker.once('listening', r));
  const port = blocker.address().port;
  const project = tmp();
  try {
    const r = runCli(['on', '--project', project], port, tmp());
    assert.equal(r.status, 1);
    assert.match(r.stdout + r.stderr, new RegExp(`Cổng ${port} đang bị chiếm`));
    assert.equal(existsSync(path.join(project, '.claude', 'settings.local.json')), false);
  } finally {
    blocker.close();
  }
});

test('on then off installs hooks, runs the server, and restores settings', async () => {
  const port = await freePort();
  const project = tmp();
  const file = path.join(project, '.claude', 'settings.local.json');
  mkdirSync(path.dirname(file), { recursive: true });
  const original = { permissions: { allow: ['Read'] } };
  writeFileSync(file, JSON.stringify(original));
  const dataDir = tmp();

  const on = runCli(['on', '--project', project], port, dataDir);
  assert.equal(on.status, 0, on.stdout + on.stderr);
  const settings = JSON.parse(readFileSync(file, 'utf8'));
  assert.equal(settings.hooks.PreToolUse[0].hooks[0].url, `http://127.0.0.1:${port}/hook`);
  const state = await (await fetch(`http://127.0.0.1:${port}/api/state`)).json();
  assert.equal(state.hooksOn, true);

  const again = runCli(['on', '--project', project], port, dataDir);
  assert.equal(again.status, 0, again.stdout + again.stderr);

  const status = runCli(['status', '--project', project], port, dataDir);
  assert.match(status.stdout, /Hook: BẬT · Server: đang chạy/);

  const off = runCli(['off', '--project', project], port, dataDir);
  assert.equal(off.status, 0, off.stdout + off.stderr);
  assert.deepEqual(JSON.parse(readFileSync(file, 'utf8')), original);
  await assert.rejects(fetch(`http://127.0.0.1:${port}/api/state`));

  const status2 = runCli(['status', '--project', project], port, dataDir);
  assert.match(status2.stdout, /Hook: TẮT · Server: tắt/);
});

test('unknown command prints usage and exits 2', () => {
  const r = runCli(['dance'], 1, tmp());
  assert.equal(r.status, 2);
  assert.match(r.stdout + r.stderr, /office on\|off\|status\|demo/);
});
