// Append-only JSONL event log with a single rotated backup.
import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, statSync } from 'node:fs';
import path from 'node:path';

function readLines(file) {
  if (!existsSync(file)) return [];
  return readFileSync(file, 'utf8').split('\n').filter(Boolean);
}

function parse(line) {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

export function createEventLog({ dir, maxBytes = 5 * 1024 * 1024 }) {
  mkdirSync(dir, { recursive: true });
  const current = path.join(dir, 'events.jsonl');
  const rotated = path.join(dir, 'events.1.jsonl');
  let total = readLines(rotated).length + readLines(current).length;

  return {
    append(ev) {
      const line = JSON.stringify(ev) + '\n';
      if (existsSync(current) && statSync(current).size + Buffer.byteLength(line) > maxBytes) {
        renameSync(current, rotated);
      }
      appendFileSync(current, line);
      total += 1;
    },
    readTail(n = 2000) {
      const lines = [...readLines(rotated), ...readLines(current)].slice(-n);
      return lines.map(parse).filter(Boolean);
    },
    count() {
      return total;
    },
  };
}
