/**
 * Return the gallery direction for a completed horizontal swipe.
 * Positive means next, negative means previous, and zero is ignored.
 */
export function photoSwipeDirection(start, end, threshold = 48) {
  if (!start || !end) return 0;
  const dx = Number(end.x) - Number(start.x);
  const dy = Number(end.y) - Number(start.y);
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return 0;
  if (Math.abs(dx) < threshold || Math.abs(dx) <= Math.abs(dy)) return 0;
  return dx < 0 ? 1 : -1;
}
