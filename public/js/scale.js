// Display scale for the room: as large as fits, in 0.5 steps; a window too small for x1 shrinks it exactly to fit.
export function fitScale(availW, availH, W, H) {
  const fit = Math.min(availW / W, availH / H);
  return fit < 1 ? fit : Math.floor(fit * 2) / 2;
}
