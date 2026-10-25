// Vietnamese speech-bubble text for an OfficeEvent.
import { clip } from './summarize.js';

const BUBBLE_MAX = 56;

function toolPhrase(tool, detail) {
  switch (tool) {
    case 'Read': return `Đọc ${detail}`;
    case 'Edit':
    case 'MultiEdit': return `Sửa ${detail}`;
    case 'Write': return `Viết ${detail}`;
    case 'Bash':
    case 'PowerShell': return detail;
    case 'Grep':
    case 'Glob': return 'Tìm kiếm…';
    case 'Agent':
    case 'Task': return `Giao việc cho ${detail}`;
    case 'WebSearch':
    case 'WebFetch': return 'Tra cứu web…';
  }
  if (tool.startsWith('mcp__')) return `Dùng ${tool.split('__')[1]}`;
  return `Dùng ${tool}`;
}

export function bubbleText(ev) {
  let text = '';
  if (ev.ok === false) text = `Lỗi: ${ev.detail}`;
  else if (ev.waiting) text = 'Chờ sếp duyệt…';
  else if (ev.ev === 'SubagentStart') text = 'Vào việc!';
  else if (ev.ev === 'SubagentStop' || ev.ev === 'Stop') text = 'Xong rồi ✓';
  else if (ev.tool) text = toolPhrase(ev.tool, ev.detail);
  return clip(text, BUBBLE_MAX);
}
