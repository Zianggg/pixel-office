import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { deskKits } from '../public/js/room.js';

const layout = JSON.parse(readFileSync(new URL('../public/layout.json', import.meta.url), 'utf8'));

test('each agent desk shows that agent kit; spare desks show none', () => {
  const kits = deskKits(layout);
  assert.equal(kits.length, layout.desks.length);
  for (const a of layout.agents) assert.equal(kits[a.desk], `kit_${a.kit}`, a.type);
  layout.desks.forEach((d, i) => { if (d.spare) assert.equal(kits[i], null); });
});
