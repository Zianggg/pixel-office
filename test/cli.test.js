import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import net from 'node:net';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { officeCommand, parseArgs, withProject } from '../cli.js';

const cli = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'cli.js');
const tmp = () => mkdtempSync(path.join(tmpdir(), 'office-cli-'));
const freePort = () => new Promise((resolve) => {
  const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); });
});
const runCli = (args, port, dataDir) => spawnSync(process.execPath, [cli, ...args], {
  encoding: 'utf8', timeout: 20000,
  env: { ...process.env, CLAUDE_PROJECT_DIR: '', OFFICE_PORT: String(port), OFFICE_DATA: dataDir, OFFICE_NO_BROWSER: '1' },
});
const repoParent = path.resolve(path.dirname(cli), '..', '..');

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

test('off removes a settings file (and .claude folder) that on had to create', async () => {
  const port = await freePort();
  const project = tmp();
  const file = path.join(project, '.claude', 'settings.local.json');
  const dataDir = tmp();
  const on = runCli(['on', '--project', project], port, dataDir);
  assert.equal(on.status, 0, on.stdout + on.stderr);
  assert.ok(existsSync(file));
  const off = runCli(['off', '--project', project], port, dataDir);
  assert.equal(off.status, 0, off.stdout + off.stderr);
  assert.equal(existsSync(file), false, 'settings.local.json should be gone again');
  assert.equal(existsSync(path.dirname(file)), false, 'the .claude folder on created should be gone too');
});

test('on says hooks work at once, also in open sessions, and points subfolders to --project', async () => {
  const port = await freePort();
  const project = tmp();
  const dataDir = tmp();
  const on = runCli(['on', '--project', project], port, dataDir);
  assert.equal(on.status, 0, on.stdout + on.stderr);
  assert.doesNotMatch(on.stdout, /mở lại/);
  assert.match(on.stdout, /có hiệu lực ngay/);
  assert.match(on.stdout, /--project/);
  runCli(['off', '--project', project], port, dataDir);
});

test('status warns when hooks are on but the server is down', async () => {
  const port = await freePort();
  const project = tmp();
  const dataDir = tmp();
  runCli(['on', '--project', project], port, dataDir);
  const base = 'http://127.0.0.1:' + port;
  await fetch(base + '/shutdown', { method: 'POST' });
  for (let i = 0; i < 50; i++) {
    try { await fetch(base + '/api/state'); } catch { break; }
    await new Promise((r) => setTimeout(r, 100));
  }
  const status = runCli(['status', '--project', project], port, dataDir);
  assert.match(status.stdout, /Hook: BẬT · Server: tắt/);
  assert.match(status.stdout, /⚠.*hook error/);
  runCli(['off', '--project', project], port, dataDir);
});

test('unknown command prints usage and exits 2', () => {
  const r = runCli(['dance'], 1, tmp());
  assert.equal(r.status, 2);
  assert.match(r.stdout + r.stderr, /office on\|off\|status\|demo/);
});

test('project defaults to two folders above cli.js, then $CLAUDE_PROJECT_DIR, then --project', () => {
  const other = tmp();
  assert.equal(parseArgs(['status'], {}).project, repoParent);
  assert.equal(parseArgs(['status'], { CLAUDE_PROJECT_DIR: other }).project, other);
  assert.equal(parseArgs(['status', '--project', other], { CLAUDE_PROJECT_DIR: tmp() }).project, other);
  assert.equal(parseArgs(['install', '--force'], {}).force, true);
});

test('status without --project reports the folder two levels above cli.js', async () => {
  const r = runCli(['status'], await freePort(), tmp());
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.ok(r.stdout.includes(`Project: ${repoParent}`), r.stdout);
});

test('a project folder that does not exist is refused and nothing is created', async () => {
  const project = path.join(tmp(), 'missing');
  const r = runCli(['on', '--project', project], await freePort(), tmp());
  assert.equal(r.status, 1);
  assert.match(r.stderr, /Không thấy thư mục project/);
  assert.equal(existsSync(project), false);
});

test('install copies /office with a project-relative cli path, keeps an identical copy, refuses to overwrite without --force', async () => {
  const port = await freePort();
  const project = tmp();
  const dest = path.join(project, '.claude', 'commands', 'office.md');

  const first = runCli(['install', '--project', project], port, tmp());
  assert.equal(first.status, 0, first.stdout + first.stderr);
  const text = readFileSync(dest, 'utf8');
  assert.equal(text, officeCommand(project));
  assert.doesNotMatch(text, /\{\{CLI\}\}/);
  const cliRel = path.relative(project, cli).split(path.sep).join('/');
  assert.ok(text.includes(`node "${cliRel}" $ARGUMENTS`), text);

  const again = runCli(['install', '--project', project], port, tmp());
  assert.equal(again.status, 0);
  assert.match(again.stdout, /đã có sẵn/);

  writeFileSync(dest, 'của tôi');
  const refused = runCli(['install', '--project', project], port, tmp());
  assert.equal(refused.status, 1);
  assert.equal(readFileSync(dest, 'utf8'), 'của tôi');

  const forced = runCli(['install', '--project', project, '--force'], port, tmp());
  assert.equal(forced.status, 0, forced.stdout + forced.stderr);
  assert.equal(readFileSync(dest, 'utf8'), text);
});

test('the demo scenario has no hard-coded project and {{PROJECT}} is filled in everywhere', () => {
  const raw = readFileSync(path.join(path.dirname(cli), 'demo', 'scenario.json'), 'utf8');
  assert.doesNotMatch(raw, /UnityProject/);
  const project = String.raw`D:\Work\Game`;
  const filled = withProject(JSON.parse(raw), project);
  assert.doesNotMatch(JSON.stringify(filled), /\{\{PROJECT\}\}/);
  assert.equal(filled[0].payload.cwd, project);
  assert.equal(filled[0].payload.tool_input.file_path, String.raw`D:\Work\Game\CLAUDE.md`);
});
