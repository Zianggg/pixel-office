import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { deskKits, tileAt } from '../public/js/room.js';

const layout = JSON.parse(readFileSync(new URL('../public/layout.json', import.meta.url), 'utf8'));

test('each agent desk shows that agent kit; spare desks show none', () => {
  const kits = deskKits(layout);
  assert.equal(kits.length, layout.desks.length);
  for (const a of layout.agents) assert.equal(kits[a.desk], `kit_${a.kit}`, a.type);
  layout.desks.forEach((d, i) => { if (d.spare) assert.equal(kits[i], null); });
});

test('tileAt names wall, trim, floor, divider and doorway tiles', () => {
  const l = layout;
  assert.equal(tileAt(l, 5, 0), 'wall');
  assert.equal(tileAt(l, 5, 2), 'wallTrim');
  assert.equal(tileAt(l, 30, 1), 'wallPantry');
  assert.equal(tileAt(l, 30, 2), 'wallPantryTrim');
  assert.equal(tileAt(l, 30, 10), 'wallGame');
  assert.equal(tileAt(l, 30, 11), 'wallGameTrim');
  assert.equal(tileAt(l, 30, 4), 'floorTile');
  assert.equal(tileAt(l, 30, 14), 'floorCarpet');
  assert.ok(['floor', 'floor2'].includes(tileAt(l, 5, 5)));
  assert.equal(tileAt(l, 24, 1), 'wall');
  assert.equal(tileAt(l, 24, 2), 'wallTrim');
  assert.equal(tileAt(l, 24, 8), 'divider');
  assert.equal(tileAt(l, 24, 5), 'doorway');
  assert.equal(tileAt(l, 24, 15), 'doorway');
  assert.equal(tileAt(l, 99, 0), null);
});
