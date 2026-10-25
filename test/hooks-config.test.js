import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  HOOK_URL, HOOK_EVENTS, addOfficeHooks, removeOfficeHooks, hasOfficeHooks, readSettings, writeSettings,
} from '../lib/hooks-config.js';

const userSettings = () => ({
  permissions: { allow: ['Bash(unity:*)'] },
  hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'echo hi' }] }] },
});

test('constants', () => {
  assert.equal(HOOK_URL, 'http://127.0.0.1:4848/hook');
  assert.deepEqual(HOOK_EVENTS, ['SubagentStart', 'PreToolUse', 'PostToolUse', 'PostToolUseFailure', 'SubagentStop', 'Notification', 'Stop']);
});

test('adds an http hook for every event', () => {
  const s = addOfficeHooks({});
  for (const e of HOOK_EVENTS) {
    assert.deepEqual(s.hooks[e], [{ hooks: [{ type: 'http', url: HOOK_URL, timeout: 2 }] }]);
  }
  assert.equal(hasOfficeHooks(s), true);
  assert.equal(hasOfficeHooks({}), false);
});

test('adding twice does not duplicate', () => {
  const s = addOfficeHooks(addOfficeHooks({}));
  assert.equal(s.hooks.PreToolUse.length, 1);
});

test('keeps the user settings and hooks alongside office hooks', () => {
  const s = addOfficeHooks(userSettings());
  assert.deepEqual(s.permissions, { allow: ['Bash(unity:*)'] });
  assert.equal(s.hooks.PreToolUse.length, 2);
  assert.equal(s.hooks.PreToolUse[0].hooks[0].command, 'echo hi');
});

test('does not mutate the input', () => {
  const input = userSettings();
  addOfficeHooks(input);
  assert.deepEqual(input, userSettings());
});

test('remove after add restores the original exactly', () => {
  assert.deepEqual(removeOfficeHooks(addOfficeHooks({})), {});
  assert.deepEqual(removeOfficeHooks(addOfficeHooks(userSettings())), userSettings());
});

test('a custom url is honoured', () => {
  const url = 'http://127.0.0.1:5000/hook';
  const s = addOfficeHooks({}, url);
  assert.equal(s.hooks.Stop[0].hooks[0].url, url);
  assert.equal(hasOfficeHooks(s), false);
  assert.equal(hasOfficeHooks(s, url), true);
  assert.deepEqual(removeOfficeHooks(s, url), {});
});

test('readSettings handles a missing file, a BOM and corrupt JSON', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'office-cfg-'));
  assert.deepEqual(readSettings(path.join(dir, 'none.json')), {});
  const bom = path.join(dir, 'bom.json');
  writeFileSync(bom, '﻿{"a":1}');
  assert.deepEqual(readSettings(bom), { a: 1 });
  const bad = path.join(dir, 'bad.json');
  writeFileSync(bad, '{hỏng');
  assert.throws(() => readSettings(bad), /không đọc được/);
});

test('writeSettings creates the folder and writes 2-space JSON', () => {
  const file = path.join(mkdtempSync(path.join(tmpdir(), 'office-cfg-')), '.claude', 'settings.local.json');
  writeSettings(file, { a: 1 });
  assert.equal(readFileSync(file, 'utf8'), '{\n  "a": 1\n}\n');
});
