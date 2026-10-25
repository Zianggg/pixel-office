import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, existsSync, statSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createEventLog } from '../lib/eventlog.js';

const tmp = () => mkdtempSync(path.join(tmpdir(), 'office-log-'));
const ev = (i) => ({ t: i, ev: 'PreToolUse', detail: `event-${i}` });

test('appends and reads back in order', () => {
  const log = createEventLog({ dir: tmp() });
  [1, 2, 3].forEach((i) => log.append(ev(i)));
  assert.deepEqual(log.readTail().map((e) => e.t), [1, 2, 3]);
  assert.equal(log.count(), 3);
});

test('creates the directory when missing', () => {
  const dir = path.join(tmp(), 'nested', 'data');
  createEventLog({ dir }).append(ev(1));
  assert.ok(existsSync(path.join(dir, 'events.jsonl')));
});

test('rotates when the file exceeds maxBytes', () => {
  const dir = tmp();
  const log = createEventLog({ dir, maxBytes: 200 });
  for (let i = 0; i < 20; i++) log.append(ev(i));
  assert.ok(existsSync(path.join(dir, 'events.1.jsonl')));
  assert.ok(statSync(path.join(dir, 'events.jsonl')).size < 200);
});

test('readTail spans the rotated file and returns the newest n', () => {
  const dir = tmp();
  const log = createEventLog({ dir, maxBytes: 200 });
  for (let i = 0; i < 20; i++) log.append(ev(i));
  assert.deepEqual(log.readTail(5).map((e) => e.t), [15, 16, 17, 18, 19]);
});

test('corrupt lines are skipped', () => {
  const dir = tmp();
  const log = createEventLog({ dir });
  log.append(ev(1));
  appendFileSync(path.join(dir, 'events.jsonl'), '{hỏng\n');
  log.append(ev(2));
  assert.deepEqual(log.readTail().map((e) => e.t), [1, 2]);
});
