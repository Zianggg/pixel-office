// Display scale for the room: as large as fits, in 0.5 steps, never below 1.
export function fitScale(availW, availH, W, H) {
  return Math.max(1, Math.floor(Math.min(availW / W, availH / H) * 2) / 2);
}
