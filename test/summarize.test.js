import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarize, clip } from '../lib/summarize.js';

const base = { session_id: 's1', transcript_path: 'x.jsonl', cwd: 'E:\\UnityProject' };
const sub = { agent_id: 'a1', agent_type: 'unity-gameplay-programmer' };

test('Edit with a Windows path keeps only the file name', () => {
  const ev = summarize({ ...base, ...sub, hook_event_name: 'PreToolUse', tool_name: 'Edit',
    tool_input: { file_path: 'E:\\UnityProject\\Game\\Assets\\Player.cs', old_string: 'a', new_string: 'b' } }, 1000);
  assert.equal(ev.detail, 'Player.cs');
  assert.equal(ev.t, 1000);
  assert.equal(ev.ev, 'PreToolUse');
  assert.equal(ev.session, 's1');
  assert.equal(ev.agentId, 'a1');
  assert.equal(ev.agentType, 'unity-gameplay-programmer');
  assert.equal(ev.tool, 'Edit');
  assert.equal(ev.ok, null);
});

test('POSIX paths also reduce to the file name', () => {
  const ev = summarize({ ...base, hook_event_name: 'PreToolUse', tool_name: 'Read', tool_input: { file_path: '/home/u/a/b.txt' } });
  assert.equal(ev.detail, 'b.txt');
});

test('Write never leaks file content', () => {
  const content = 'SECRET'.repeat(2000);
  const ev = summarize({ ...base, ...sub, hook_event_name: 'PostToolUse', tool_name: 'Write',
    tool_input: { file_path: 'C:\\a\\Notes.md', content }, tool_response: { filePath: 'C:\\a\\Notes.md', content } });
  assert.equal(ev.detail, 'Notes.md');
  assert.ok(!JSON.stringify(ev).includes('SECRET'));
  assert.equal(ev.ok, true);
});

test('Bash uses description when present', () => {
  const ev = summarize({ ...base, hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'npm test', description: 'Chạy test' } });
  assert.equal(ev.detail, 'Chạy test');
});

test('Bash without description falls back to a clipped command', () => {
  const ev = summarize({ ...base, hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'x'.repeat(500) } });
  assert.ok(Array.from(ev.detail).length <= 120);
  assert.ok(ev.detail.startsWith('xxx'));
});

test('Agent tool reports the delegated subagent type', () => {
  const ev = summarize({ ...base, hook_event_name: 'PreToolUse', tool_name: 'Agent', tool_input: { subagent_type: 'unity-qa-tester', prompt: 'long prompt' } });
  assert.equal(ev.detail, 'unity-qa-tester');
});

test('PostToolUseFailure keeps the first error line', () => {
  const ev = summarize({ ...base, hook_event_name: 'PostToolUseFailure', tool_name: 'Bash', tool_input: { command: 'npm test' },
    error: 'Exit code 1\nError: X' });
  assert.equal(ev.ok, false);
  assert.equal(ev.detail, 'Exit code 1');
});

test('SubagentStop clips the final report to 2000 characters', () => {
  const ev = summarize({ ...base, ...sub, hook_event_name: 'SubagentStop', last_assistant_message: 'đ'.repeat(5000) });
  assert.ok(Array.from(ev.finalReport).length <= 2000);
  assert.equal(ev.finalReport.slice(0, 3), 'đđđ');
});

test('permission notifications mark waiting', () => {
  const a = summarize({ ...base, hook_event_name: 'Notification', notification_type: 'permission_prompt', message: 'Claude needs your permission to use Bash' });
  const b = summarize({ ...base, hook_event_name: 'Notification', message: 'Claude needs your permission to use Bash' });
  const c = summarize({ ...base, hook_event_name: 'Notification', notification_type: 'idle_prompt', message: 'Claude is waiting for your input' });
  assert.equal(a.waiting, true);
  assert.equal(b.waiting, true);
  assert.equal(c.waiting, false);
});

test('main-thread events have null agent fields', () => {
  const ev = summarize({ ...base, hook_event_name: 'Stop' });
  assert.equal(ev.agentId, null);
  assert.equal(ev.agentType, null);
  assert.equal(ev.finalReport, null);
  assert.equal(ev.waiting, false);
});

test('payload without hook_event_name yields null', () => {
  assert.equal(summarize({}), null);
  assert.equal(summarize(null), null);
});

test('clip cuts by code point and appends an ellipsis', () => {
  const out = clip('Sửa 😀😀😀', 6);
  assert.ok(!/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/.test(out));
  assert.ok(out.endsWith('…'));
  assert.equal(Array.from(out).length, 6);
  assert.equal(clip('ngắn', 10), 'ngắn');
});

test('real Claude Code 2.1.310 permission Notification (raised by a subagent) is waiting with no agent fields', () => {
  // Captured with OFFICE_DEBUG=1 while a general-purpose subagent asked to run `touch` (scratchpad_dir trimmed).
  const real = {
    session_id: 'c67dfb2c-c6c3-48c6-a364-e7de600c2415', cwd: 'E:\UnityProject',
    prompt_id: 'f315cbd9-2ce2-4b5d-881c-52207f494df9', hook_event_name: 'Notification',
    message: 'Claude needs your permission', notification_type: 'permission_prompt',
  };
  const ev = summarize(real, 5);
  assert.equal(ev.waiting, true);
  assert.equal(ev.agentId, null);
  assert.equal(ev.agentType, null);
});
