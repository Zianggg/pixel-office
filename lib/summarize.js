// Turns a raw Claude Code hook payload into a small OfficeEvent.
// Never copies file contents or full tool responses.
import path from 'node:path';

const DETAIL_MAX = 120;
const REPORT_MAX = 2000;

export function clip(s, n) {
  const chars = Array.from(String(s ?? ''));
  if (chars.length <= n) return chars.join('');
  return chars.slice(0, n - 1).join('') + '…';
}

function firstLine(s) {
  return String(s ?? '').split(/\r?\n/)[0];
}

function toolDetail(tool, input = {}) {
  if (input.file_path) return path.win32.basename(input.file_path);
  if (input.notebook_path) return path.win32.basename(input.notebook_path);
  switch (tool) {
    case 'Bash':
    case 'PowerShell':
      return input.description || firstLine(input.command);
    case 'Agent':
    case 'Task':
      return input.subagent_type || input.description || '';
    case 'Grep':
    case 'Glob':
      return input.pattern || '';
    case 'WebFetch':
      return input.url || '';
    case 'WebSearch':
      return input.query || '';
    default:
      return input.description || '';
  }
}

function isWaiting(p) {
  if (p.hook_event_name !== 'Notification') return false;
  if (p.notification_type === 'permission_prompt') return true;
  return /permission/i.test(p.message || '');
}

const str = (v) => (typeof v === 'string' ? v : null);

export function summarize(payload, now = Date.now()) {
  if (!payload || typeof payload !== 'object' || typeof payload.hook_event_name !== 'string') return null;
  const p = payload;
  const ev = p.hook_event_name;
  const tool = str(p.tool_name);
  let detail = '';
  let ok = null;
  if (tool) detail = toolDetail(tool, p.tool_input && typeof p.tool_input === 'object' ? p.tool_input : {});
  if (ev === 'PostToolUse') ok = true;
  if (ev === 'PostToolUseFailure') {
    ok = false;
    detail = firstLine(p.error) || detail;
  }
  if (ev === 'Notification') detail = str(p.message) ?? '';
  return {
    t: now,
    ev,
    session: str(p.session_id) ?? '',
    agentId: str(p.agent_id),
    agentType: str(p.agent_type),
    tool,
    toolUseId: str(p.tool_use_id),
    detail: clip(detail, DETAIL_MAX),
    ok,
    waiting: isWaiting(p),
    finalReport: ev === 'SubagentStop' && p.last_assistant_message
      ? clip(p.last_assistant_message, REPORT_MAX)
      : null,
  };
}
