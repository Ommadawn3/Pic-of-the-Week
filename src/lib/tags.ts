import type { FeedPhoto, TagVariant } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Derives a photo's single display tag, prioritized Leading > Trending > New.
 * See PRD §4.3. The Trending heuristic is intentionally simple for now and
 * gets tuned in Phase 6 once real view-time data exists.
 *
 * @param isActiveWeek archived weeks don't show live tags
 */
export function deriveTag(photo: FeedPhoto, isActiveWeek: boolean, now = new Date()): TagVariant | undefined {
  if (!isActiveWeek) return undefined;

  if (photo.rank === 1 && photo.score > 0) return "leading";

  // Trending: has real engagement but isn't yet #1. Placeholder threshold —
  // a photo pulling meaningfully more than a single capped view on average.
  if (photo.viewer_count >= 3 && photo.score >= 20) return "trending";

  const ageMs = now.getTime() - new Date(photo.created_at).getTime();
  if (ageMs <= DAY_MS) return "new";

  return undefined;
}
