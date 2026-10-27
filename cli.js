// office on|off|status|demo|install — turns the Pixel Office hooks and server on or off.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { addOfficeHooks, hasOfficeHooks, readSettings, removeOfficeHooks, writeSettings } from './lib/hooks-config.js';
import { hookUrl, settingsFile } from './server.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const env = process.env;
const port = Number(env.OFFICE_PORT || 4848);
const dataDir = env.OFFICE_DATA || path.join(here, 'data');
const base = `http://127.0.0.1:${port}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const USAGE = 'Cách dùng: office on|off|status|demo|install [--project <thư mục project>] [--force]';

// Project = --project, else $CLAUDE_PROJECT_DIR, else two levels up (the repo lives at <project>/tools/pixel-office).
export function parseArgs(argv, { CLAUDE_PROJECT_DIR } = env) {
  const out = { cmd: argv[0], project: CLAUDE_PROJECT_DIR || path.resolve(here, '..', '..'), force: argv.includes('--force') };
  const i = argv.indexOf('--project');
  if (i !== -1 && argv[i + 1]) out.project = argv[i + 1];
  out.project = path.resolve(out.project);
  return out;
}

function requireProject(project) {
  if (!existsSync(project) || !statSync(project).isDirectory()) {
    console.error(`✗ Không thấy thư mục project: ${project} — truyền đúng --project <thư mục>`);
    process.exit(1);
  }
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

async function startServer(project, dir = dataDir) {
  spawn(process.execPath, [path.join(here, 'server.js')], {
    detached: true, stdio: 'ignore', windowsHide: true,
    env: { ...env, OFFICE_PORT: String(port), OFFICE_DATA: dir, OFFICE_PROJECT: project },
  }).unref();
  for (let i = 0; i < 50; i++) {
    if (await probe()) return true;
    await sleep(100);
  }
  return false;
}

function openBrowser() {
  if (env.OFFICE_NO_BROWSER) return false;
  const [cmd, args] = { win32: ['cmd', ['/c', 'start', '""', base]], darwin: ['open', [base]] }[process.platform]
    ?? ['xdg-open', [base]];
  const child = spawn(cmd, args, { detached: true, stdio: 'ignore', windowsHide: true });
  child.on('error', () => console.log(`⚠ Không tự mở được trình duyệt — mở tay: ${base}`));
  child.unref();
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
  // Verified with Claude Code 2.1.310: open sessions pick up the hooks at once; only sessions opened in
  // this exact folder read its settings, so subfolders (game projects) need their own --project.
  console.log(`✓ Hook có hiệu lực ngay, kể cả với phiên Claude đang mở tại ${project}`);
  console.log(`⚠ Phiên mở ở thư mục con không được theo dõi — chạy thêm: office on --project <thư mục con>`);
}

async function off(project) {
  const file = settingsFile(project);
  const settings = loadSettings(file);
  if (hasOfficeHooks(settings, hookUrl(port))) {
    const rest = removeOfficeHooks(settings, hookUrl(port));
    // Nothing else left means `on` created the file — remove it so the project is exactly as before.
    if (Object.keys(rest).length === 0) {
      rmSync(file, { force: true });
      if (readdirSync(path.dirname(file)).length === 0) rmdirSync(path.dirname(file));
    } else writeSettings(file, rest);
  }
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
  console.log(`Project: ${project}`);
  console.log(`Hook: ${hooks ? 'BẬT' : 'TẮT'} · Server: ${srv ? 'đang chạy' : 'tắt'} · Sự kiện đã nhận: ${srv ? srv.events : 0}`);
  if (hooks && !srv) {
    console.log('⚠ Hook còn bật mà server đã tắt: Claude vẫn chạy bình thường nhưng mỗi tool call hiện dòng "hook error" — chạy office on để bật lại server, hoặc office off để gỡ hook');
  }
}

async function demo(project) {
  if (!(await probe())) {
    if (!(await portFree())) {
      console.error(`✗ Cổng ${port} đang bị chiếm.`);
      process.exit(1);
    }
    if (!(await startServer(project, path.join(dataDir, 'demo')))) {
      console.error('✗ Server không khởi động được.');
      process.exit(1);
    }
  }
  openBrowser();
  const scenario = withProject(JSON.parse(readFileSync(path.join(here, 'demo', 'scenario.json'), 'utf8')), project);
  console.log(`▶ Đang phát ${scenario.length} sự kiện demo tại ${base} …`);
  for (const step of scenario) {
    await sleep(step.delayMs ?? 0);
    await fetch(`${base}/hook`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(step.payload) });
  }
  console.log('✓ Demo xong. Tắt server bằng: office off');
}

// Swaps every {{PROJECT}} in the scenario's strings for the real project folder.
export function withProject(value, project) {
  if (typeof value === 'string') return value.replaceAll('{{PROJECT}}', project);
  if (Array.isArray(value)) return value.map((v) => withProject(v, project));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, withProject(v, project)]));
  }
  return value;
}

// The /office slash command for a project, calling this cli.js by its path relative to the project root.
export function officeCommand(project) {
  const cli = path.relative(project, path.join(here, 'cli.js')).split(path.sep).join('/');
  return readFileSync(path.join(here, 'claude', 'commands', 'office.md'), 'utf8').replaceAll('{{CLI}}', cli);
}

async function install(project, { force }) {
  const text = officeCommand(project);
  const dest = path.join(project, '.claude', 'commands', 'office.md');
  if (existsSync(dest)) {
    if (readFileSync(dest, 'utf8') === text) {
      console.log(`✓ Lệnh /office đã có sẵn ở ${dest}`);
      return;
    }
    if (!force) {
      console.error(`✗ ${dest} đã có và khác bản trong repo — chạy lại với --force để ghi đè`);
      process.exit(1);
    }
  }
  mkdirSync(path.dirname(dest), { recursive: true });
  writeFileSync(dest, text);
  console.log(`✓ Đã cài lệnh /office vào ${dest}`);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const { cmd, project, force } = parseArgs(process.argv.slice(2));
  const commands = { on, off, status, demo, install };
  if (!commands[cmd]) {
    console.error(USAGE);
    process.exit(2);
  }
  requireProject(project);
  await commands[cmd](project, { force });
}
