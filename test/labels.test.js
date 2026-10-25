import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bubbleText } from '../lib/labels.js';

const ev = (o) => ({ t: 0, ev: 'PreToolUse', session: 's', agentId: 'a', agentType: 'x', tool: null,
  toolUseId: null, detail: '', ok: null, waiting: false, finalReport: null, ...o });

test('tool phrases', () => {
  assert.equal(bubbleText(ev({ tool: 'Read', detail: 'GDD.md' })), 'Đọc GDD.md');
  assert.equal(bubbleText(ev({ tool: 'Edit', detail: 'Player.cs' })), 'Sửa Player.cs');
  assert.equal(bubbleText(ev({ tool: 'MultiEdit', detail: 'Player.cs' })), 'Sửa Player.cs');
  assert.equal(bubbleText(ev({ tool: 'Write', detail: 'TECH.md' })), 'Viết TECH.md');
  assert.equal(bubbleText(ev({ tool: 'Bash', detail: 'Chạy test' })), 'Chạy test');
  assert.equal(bubbleText(ev({ tool: 'PowerShell', detail: 'Build game' })), 'Build game');
  assert.equal(bubbleText(ev({ tool: 'Grep', detail: 'foo' })), 'Tìm kiếm…');
  assert.equal(bubbleText(ev({ tool: 'Glob', detail: '*.cs' })), 'Tìm kiếm…');
  assert.equal(bubbleText(ev({ tool: 'Agent', detail: 'unity-qa-tester' })), 'Giao việc cho unity-qa-tester');
  assert.equal(bubbleText(ev({ tool: 'WebSearch' })), 'Tra cứu web…');
  assert.equal(bubbleText(ev({ tool: 'WebFetch' })), 'Tra cứu web…');
  assert.equal(bubbleText(ev({ tool: 'mcp__pixel__draw_rect' })), 'Dùng pixel');
  assert.equal(bubbleText(ev({ tool: 'NotebookEdit' })), 'Dùng NotebookEdit');
});

test('lifecycle phrases', () => {
  assert.equal(bubbleText(ev({ ev: 'SubagentStart' })), 'Vào việc!');
  assert.equal(bubbleText(ev({ ev: 'SubagentStop' })), 'Xong rồi ✓');
  assert.equal(bubbleText(ev({ ev: 'Stop' })), 'Xong rồi ✓');
});

test('failure and waiting take priority over the tool phrase', () => {
  assert.equal(bubbleText(ev({ ev: 'PostToolUseFailure', tool: 'Bash', ok: false, detail: 'Exit code 1' })), 'Lỗi: Exit code 1');
  assert.equal(bubbleText(ev({ ev: 'Notification', waiting: true, detail: 'needs permission' })), 'Chờ sếp duyệt…');
});

test('long vietnamese text is clipped to 56 code points', () => {
  const out = bubbleText(ev({ tool: 'Bash', detail: 'Đang xây dựng bản build thử nghiệm '.repeat(6) }));
  assert.ok(Array.from(out).length <= 56);
  assert.ok(out.endsWith('…'));
});
