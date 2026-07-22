import type { FeedPhoto, TagVariant } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Derives a photo's display tag. There is no "leading" tag — the #1 photo is
 * identified by its rank badge alone, so the tags are purely about discovery:
 * something climbing, or something just posted.
 *
 * @param isActiveWeek archived weeks don't show live tags
 */
export function deriveTag(
  photo: FeedPhoto,
  isActiveWeek: boolean,
  now = new Date(),
): TagVariant | undefined {
  if (!isActiveWeek) return undefined;
  if (isTrending(photo)) return "trending";
  if (isNew(photo, now)) return "new";
  return undefined;
}

/** Real engagement but not yet at the top. Threshold is a placeholder pending
 *  the scoring rework — see the algorithm workshop. */
export function isTrending(photo: FeedPhoto): boolean {
  return photo.rank > 1 && photo.viewer_count >= 3 && photo.score >= 20;
}

export function isNew(photo: FeedPhoto, now = new Date()): boolean {
  return now.getTime() - new Date(photo.created_at).getTime() <= DAY_MS;
}
