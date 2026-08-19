import type { FeedPhoto, TagVariant } from "./types";

/**
 * A photo's display tag, derived straight from its ranking-v2 state. The #1 photo
 * is identified by its rank badge alone, so tags are purely about discovery:
 *   • "hot" — high attention, not yet seen by enough people to validate.
 *   • "new" — barely seen yet; needs exposure.
 * Ranked (validated) and archived-week photos show no tag.
 *
 * @param isActiveWeek archived weeks don't show live tags
 */
export function deriveTag(photo: FeedPhoto, isActiveWeek: boolean): TagVariant | undefined {
  if (!isActiveWeek) return undefined;
  if (photo.state === "hot") return "hot";
  if (photo.state === "new") return "new";
  return undefined;
}
