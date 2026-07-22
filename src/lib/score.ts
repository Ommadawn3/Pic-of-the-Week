/**
 * Single source of truth for how the ranking metric is described to users.
 *
 * The metric itself is still being decided (average vs total vs smoothed
 * average — see the algorithm workshop). Keeping the label and formatting here
 * means the user-facing wording changes in exactly one place when it lands,
 * rather than being scattered across the UI.
 *
 * Today `score` is the mean of each viewer's single best session, capped at
 * 120s per viewer.
 */
export const VIEW_TIME_LABEL = "Average view time";

/** Renders a seconds value as "47s" or "1m 12s". */
export function formatViewTime(seconds: number): string {
  const s = Math.round(Number(seconds) || 0);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem === 0 ? `${m}m` : `${m}m ${rem}s`;
}
