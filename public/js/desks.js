// Desk geometry shared by the room renderer and the light pass. Offsets are authored for 16px tiles and scale with layout.tile.

export function monitorPos(desk, T = 16) {
  return { x: desk.seat[0] * T, y: desk.y * T - (10 * T) / 16 };
}

// Per desk: the sprite name of the owning agent's personal kit, or null (spare desks keep a plain pc).
export function deskKits(layout) {
  const kits = layout.desks.map(() => null);
  for (const a of layout.agents) if (a.kit && kits[a.desk] !== undefined) kits[a.desk] = `kit_${a.kit}`;
  return kits;
}
