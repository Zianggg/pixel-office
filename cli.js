// office on|off|status|demo — turns the Pixel Office hooks and server on or off.
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { addOfficeHooks, hasOfficeHooks, readSettings, removeOfficeHooks, writeSettings } from './lib/hooks-config.js';
import { hookUrl, settingsFile } from './server.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const env = process.env;
const port = Number(env.OFFICE_PORT || 4848);
const dataDir = env.OFFICE_DATA || path.join(here, 'data');
const base = `http://127.0.0.1:${port}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const USAGE = 'Cách dùng: office on|off|status|demo [--project <thư mục project>]';

function parseArgs(argv) {
  const out = { cmd: argv[0], project: 'E:\\UnityProject' };
  const i = argv.indexOf('--project');
  if (i !== -1 && argv[i + 1]) out.project = argv[i + 1];
  return out;
}

async function probe() {
  try {
    const res = await fetch(`${base}/api/state`, { signal: AbortSignal.timeout(1000) });
    const body = await res.json();
    return body && body.layout ? body : null;
  } catch {
    return null;
  }
}

function portFree() {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.once('error', () => resolve(false));
    s.listen(port, '127.0.0.1', () => s.close(() => resolve(true)));
  });
}

async function startServer(project) {
  spawn(process.execPath, [path.join(here, 'server.js')], {
    detached: true, stdio: 'ignore', windowsHide: true,
    env: { ...env, OFFICE_PORT: String(port), OFFICE_DATA: dataDir, OFFICE_PROJECT: project },
  }).unref();
  for (let i = 0; i < 50; i++) {
    if (await probe()) return true;
    await sleep(100);
  }
  return false;
}

function openBrowser() {
  if (env.OFFICE_NO_BROWSER) return false;
  spawn('cmd', ['/c', 'start', '""', base], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
  return true;
}

function loadSettings(file) {
  try {
    return readSettings(file);
  } catch (err) {
    console.error(`✗ ${err.message}`);
    process.exit(1);
  }
}

async function on(project) {
  const ours = await probe();
  if (!ours && !(await portFree())) {
    console.error(`✗ Cổng ${port} đang bị chiếm — chưa bật hook.`);
    process.exit(1);
  }
  const file = settingsFile(project);
  writeSettings(file, addOfficeHooks(loadSettings(file), hookUrl(port)));
  console.log(`✓ Đã gắn hook theo dõi vào ${project}`);
  if (!ours && !(await startServer(project))) {
    writeSettings(file, removeOfficeHooks(loadSettings(file), hookUrl(port)));
    console.error('✗ Server không khởi động được — đã gỡ hook lại.');
    process.exit(1);
  }
  console.log(`✓ Server văn phòng đang chạy: ${base}`);
  if (openBrowser()) console.log('✓ Đã mở trình duyệt');
  console.log('⚠ Phiên Claude nào đang mở từ trước cần mở lại mới được theo dõi');
}

async function off(project) {
  const file = settingsFile(project);
  const settings = loadSettings(file);
  if (hasOfficeHooks(settings, hookUrl(port))) writeSettings(file, removeOfficeHooks(settings, hookUrl(port)));
  console.log(`✓ Đã gỡ hook khỏi ${project}`);
  if (await probe()) {
    await fetch(`${base}/shutdown`, { method: 'POST' }).catch(() => {});
    for (let i = 0; i < 50 && (await probe()); i++) await sleep(100);
  }
  console.log('✓ Server văn phòng đã tắt');
}

async function status(project) {
  const hooks = hasOfficeHooks(loadSettings(settingsFile(project)), hookUrl(port));
  const srv = await probe();
  console.log(`Hook: ${hooks ? 'BẬT' : 'TẮT'} · Server: ${srv ? 'đang chạy' : 'tắt'} · Sự kiện đã nhận: ${srv ? srv.events : 0}`);
}

async function demo(project) {
  if (!(await probe())) {
    if (!(await portFree())) {
      console.error(`✗ Cổng ${port} đang bị chiếm.`);
      process.exit(1);
    }
    if (!(await startServer(project))) {
      console.error('✗ Server không khởi động được.');
      process.exit(1);
    }
  }
  openBrowser();
  const scenario = JSON.parse(readFileSync(path.join(here, 'demo', 'scenario.json'), 'utf8'));
  console.log(`▶ Đang phát ${scenario.length} sự kiện demo tại ${base} …`);
  for (const step of scenario) {
    await sleep(step.delayMs ?? 0);
    await fetch(`${base}/hook`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(step.payload) });
  }
  console.log('✓ Demo xong. Tắt server bằng: office off');
}

const { cmd, project } = parseArgs(process.argv.slice(2));
const commands = { on, off, status, demo };
if (!commands[cmd]) {
  console.error(USAGE);
  process.exit(2);
}
await commands[cmd](project);
