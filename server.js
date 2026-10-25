// Pixel Office server: receives Claude Code http hooks, keeps state, streams it over SSE.
import http from 'node:http';
import { appendFileSync, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { summarize } from './lib/summarize.js';
import { createState, reduce, resolveKey, tick } from './lib/state.js';
import { createEventLog } from './lib/eventlog.js';
import { hasOfficeHooks, readSettings } from './lib/hooks-config.js';

const BODY_MAX = 10 * 1024 * 1024;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
};

export const hookUrl = (port) => `http://127.0.0.1:${port}/hook`;
export const settingsFile = (projectDir) => path.join(projectDir, '.claude', 'settings.local.json');

function readBody(req) {
  return new Promise((resolve) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size <= BODY_MAX) chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', () => resolve(''));
  });
}

function sendJson(res, status, obj) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

function serveStatic(publicDir, urlPath, res) {
  let rel;
  try {
    rel = decodeURIComponent(urlPath);
  } catch {
    rel = '';
  }
  if (rel === '/' || rel === '') rel = '/index.html';
  const file = path.resolve(publicDir, '.' + rel);
  const inside = file.startsWith(path.resolve(publicDir) + path.sep);
  if (!inside || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Không tìm thấy');
    return;
  }
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
}

// debugRaw (OFFICE_DEBUG=1): also append each raw hook body to raw.jsonl — full payloads, for checking real hook fields only.
export async function createOfficeServer({ dataDir, publicDir, layout, projectDir, port = 4848, now = Date.now, debugRaw = false }) {
  const log = createEventLog({ dir: dataDir });
  const safeReduce = (s, ev) => {
    try {
      return reduce(s, ev, layout);
    } catch (err) {
      console.warn(`[office] bỏ qua sự kiện lỗi: ${err.message}`);
      return s;
    }
  };
  let state = log.readTail(2000).reduce(safeReduce, createState(layout));
  state = tick(state, now());
  const clients = new Set();
  let actualPort = port;

  const broadcast = (type, data) => {
    const msg = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const res of clients) res.write(msg);
  };

  const hooksOn = () => {
    try {
      return hasOfficeHooks(readSettings(settingsFile(projectDir)), hookUrl(actualPort));
    } catch {
      return false;
    }
  };

  // Only this machine's own pages and clients: blocks DNS rebinding (Host) and cross-site POSTs (Origin).
  const ownOrigins = () => [`127.0.0.1:${actualPort}`, `localhost:${actualPort}`];
  const allowed = (req) => {
    if (!ownOrigins().includes(req.headers.host)) return false;
    const origin = req.headers.origin;
    return req.method !== 'POST' || !origin || ownOrigins().some((h) => origin === `http://${h}`);
  };

  const server = http.createServer(async (req, res) => {
    if (!allowed(req)) {
      res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Không được phép');
      return;
    }
    const url = new URL(req.url, 'http://127.0.0.1');
    if (req.method === 'POST' && url.pathname === '/hook') {
      const body = await readBody(req);
      if (debugRaw) {
        mkdirSync(dataDir, { recursive: true });
        appendFileSync(path.join(dataDir, 'raw.jsonl'), body.replace(/\r?\n/g, ' ') + '\n');
      }
      let ev = null;
      try {
        ev = summarize(JSON.parse(body), now());
      } catch {
        console.warn('[office] payload hook không hợp lệ, bỏ qua');
      }
      if (ev) {
        try {
          const key = resolveKey(state, ev);
          state = reduce(state, ev, layout);
          log.append(ev);
          broadcast('event', { ev, agent: state.agents[key], totals: state.totals });
        } catch (err) {
          console.warn(`[office] bỏ qua sự kiện lỗi: ${err.message}`);
        }
      }
      return sendJson(res, 200, {});
    }
    if (req.method === 'POST' && url.pathname === '/shutdown') {
      sendJson(res, 200, {});
      setImmediate(() => close());
      return;
    }
    if (req.method === 'GET' && url.pathname === '/events') {
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
      res.write(': connected\n\n');
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }
    if (req.method === 'GET' && url.pathname === '/api/state') {
      return sendJson(res, 200, { state, layout, hooksOn: hooksOn(), events: log.count() });
    }
    if (req.method === 'GET') return serveStatic(publicDir, url.pathname, res);
    res.writeHead(405);
    res.end();
  });

  const ticker = setInterval(() => {
    const next = tick(state, now());
    if (next !== state) {
      state = next;
      broadcast('state', state);
    }
  }, 1000);
  const pinger = setInterval(() => {
    for (const res of clients) res.write(': ping\n\n');
  }, 15000);
  ticker.unref();
  pinger.unref();

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  actualPort = server.address().port;

  let closing = null;
  function close() {
    closing ??= new Promise((resolve) => {
      clearInterval(ticker);
      clearInterval(pinger);
      for (const res of clients) res.end();
      clients.clear();
      server.close(() => resolve());
      server.closeAllConnections?.();
    });
    return closing;
  }

  return { server, port: actualPort, close };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const publicDir = path.join(here, 'public');
  const srv = await createOfficeServer({
    dataDir: process.env.OFFICE_DATA || path.join(here, 'data'),
    publicDir,
    layout: JSON.parse(readFileSync(path.join(publicDir, 'layout.json'), 'utf8')),
    projectDir: process.env.OFFICE_PROJECT || 'E:\\UnityProject',
    port: Number(process.env.OFFICE_PORT || 4848),
    debugRaw: process.env.OFFICE_DEBUG === '1',
  });
  srv.server.on('close', () => process.exit(0));
  console.log(`[office] đang chạy ở http://127.0.0.1:${srv.port}`);
}
