// Exports the pixel-size "base" images of a concept sheet: node art-src/export-bases.mjs <kit>
// Reads art-src/concepts/<kit>.svg, writes art-src/bases/<kit>/{stand,back,sit}.png.
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// View → [x0, y0, x1, y1] in concept units (8 units = 1 pixel), then the PNG width and height.
export const AREAS = { stand: [0, 0, 256, 512, 32, 64], back: [256, 0, 512, 512, 32, 64], sit: [512, 0, 1024, 512, 64, 64] };

export function inkscapeArgs(svg, view, out) {
  const area = AREAS[view];
  if (!area) throw new Error(`unknown view "${view}" (expected ${Object.keys(AREAS).join(', ')})`);
  const [x0, y0, x1, y1, w, h] = area;
  return [svg, '--export-type=png', `--export-area=${x0}:${y0}:${x1}:${y1}`, `--export-width=${w}`, `--export-height=${h}`, '--export-png-antialias=0', '-o', out];
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const kit = process.argv[2];
  if (!kit) {
    console.error('usage: node art-src/export-bases.mjs <kit>');
    process.exit(2);
  }
  const root = dirname(fileURLToPath(import.meta.url));
  const svg = join(root, 'concepts', `${kit}.svg`);
  const outDir = join(root, 'bases', kit);
  mkdirSync(outDir, { recursive: true });
  // inkscape.com is the console build on Windows; the profile stays on drive E.
  const exe = process.env.INKSCAPE ?? 'E:\\Dev\\inkscape\\bin\\inkscape.com';
  const env = { INKSCAPE_PROFILE_DIR: 'E:\\Dev\\inkscape\\profile', ...process.env };
  for (const view of Object.keys(AREAS)) {
    const out = join(outDir, `${view}.png`);
    const r = spawnSync(exe, inkscapeArgs(svg, view, out), { encoding: 'utf8', env });
    if (r.status !== 0 || r.error) {
      console.error(r.error?.message ?? r.stderr);
      process.exit(1);
    }
    console.log(out);
  }
}
