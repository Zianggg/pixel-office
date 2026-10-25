// Adds/removes the office's http hooks in a Claude Code settings object.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export const HOOK_URL = 'http://127.0.0.1:4848/hook';
export const HOOK_EVENTS = ['SubagentStart', 'PreToolUse', 'PostToolUse', 'PostToolUseFailure', 'SubagentStop', 'Notification', 'Stop'];

const isOffice = (url) => (h) => h && h.type === 'http' && h.url === url;

export function hasOfficeHooks(settings, url = HOOK_URL) {
  const hooks = settings?.hooks ?? {};
  return Object.values(hooks).some((groups) =>
    Array.isArray(groups) && groups.some((g) => (g.hooks ?? []).some(isOffice(url))));
}

export function removeOfficeHooks(settings, url = HOOK_URL) {
  const s = structuredClone(settings ?? {});
  if (!s.hooks) return s;
  for (const [event, groups] of Object.entries(s.hooks)) {
    if (!Array.isArray(groups)) continue;
    const kept = groups
      .map((g) => ({ ...g, hooks: (g.hooks ?? []).filter((h) => !isOffice(url)(h)) }))
      .filter((g) => g.hooks.length > 0);
    if (kept.length > 0) s.hooks[event] = kept;
    else delete s.hooks[event];
  }
  if (Object.keys(s.hooks).length === 0) delete s.hooks;
  return s;
}

export function addOfficeHooks(settings, url = HOOK_URL) {
  const s = removeOfficeHooks(settings, url);
  s.hooks ??= {};
  for (const event of HOOK_EVENTS) {
    s.hooks[event] ??= [];
    s.hooks[event].push({ hooks: [{ type: 'http', url, timeout: 2 }] });
  }
  return s;
}

export function readSettings(file) {
  if (!existsSync(file)) return {};
  const text = readFileSync(file, 'utf8').replace(/^﻿/, '');
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(`settings.local.json không đọc được: ${err.message}`);
  }
}

export function writeSettings(file, obj) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(obj, null, 2) + '\n');
}
