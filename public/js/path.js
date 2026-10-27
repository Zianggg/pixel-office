// Walkable grid and BFS pathfinding over office tiles. No DOM.

// The room whose rectangle holds tile (x, y); null on dividers and outside the map.
export function roomAt(layout, x, y) {
  return layout.rooms.find((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) ?? null;
}

function isDoor(layout, x, y) {
  return (layout.dividers ?? []).some((d) => d.x === x && d.doors.includes(y));
}

// Walkable: a room's floor (below its wall rows) or a divider doorway, minus desks and non-decal props;
// seats and activity spots open again so actors can sit on them.
export function buildGrid(layout) {
  const grid = Array.from({ length: layout.rows }, (_, y) =>
    Array.from({ length: layout.cols }, (_, x) => {
      const r = roomAt(layout, x, y);
      return r ? y >= r.y + r.wallRows : isDoor(layout, x, y);
    }));
  const block = (x, y) => {
    if (y >= 0 && y < layout.rows && x >= 0 && x < layout.cols) grid[y][x] = false;
  };
  for (const d of layout.desks) for (let i = 0; i < d.w; i++) block(d.x + i, d.y);
  for (const p of layout.props) {
    if (p.decal) continue;
    for (let dy = 0; dy < (p.h ?? 1); dy++) for (let dx = 0; dx < (p.w ?? 1); dx++) block(p.x + dx, p.y + dy);
  }
  for (const d of layout.desks) grid[d.seat[1]][d.seat[0]] = true;
  for (const s of layout.spots ?? []) grid[s.y][s.x] = true;
  return grid;
}

export function findPath(grid, from, to) {
  const [tx, ty] = to;
  if (!grid[ty]?.[tx] || !grid[from[1]]?.[from[0]]) return null;
  const key = (x, y) => y * 1000 + x;
  const prev = new Map([[key(from[0], from[1]), null]]);
  const queue = [from];
  while (queue.length) {
    const [x, y] = queue.shift();
    if (x === tx && y === ty) {
      const path = [];
      for (let k = key(x, y), cell = [x, y]; cell; k = cell && key(cell[0], cell[1])) {
        path.push(cell);
        cell = prev.get(k);
      }
      return path.reverse();
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (grid[ny]?.[nx] && !prev.has(key(nx, ny))) {
        prev.set(key(nx, ny), [x, y]);
        queue.push([nx, ny]);
      }
    }
  }
  return null;
}
