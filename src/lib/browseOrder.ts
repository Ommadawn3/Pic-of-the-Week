import { isNew, isTrending } from "./tags";
import type { FeedPhoto } from "./types";

export type FeedSlot = {
  photo: FeedPhoto;
  /** Ranked slots show their number; discovery slots show a tag instead. */
  kind: "ranked" | "trending" | "new";
};

/**
 * Builds the scroll order for the active week: numbered leaderboard cards with
 * tagged "discovery" cards interleaved between them —
 *
 *   1, trending, 2, new, 3, …
 *
 * Two firm rules:
 *   • A discovery slot ONLY ever holds a genuinely tagged (New/Trending) photo.
 *     It never falls back to showing an untagged photo's number, which used to
 *     drop a lower rank in out of sequence (…2, 4, 3…).
 *   • Every untagged card therefore appears in strict ascending rank order.
 *
 * So a quiet week with few tagged photos simply has fewer discovery cards
 * (e.g. 1, new, 2, 3, 4) rather than out-of-order numbers.
 *
 * Archived weeks skip all of this and use plain rank order.
 */
export function buildBrowseOrder(
  ranked: FeedPhoto[],
  { isActiveWeek, now = new Date() }: { isActiveWeek: boolean; now?: Date },
): FeedSlot[] {
  if (!isActiveWeek || ranked.length <= 2) {
    return ranked.map((photo) => ({ photo, kind: "ranked" as const }));
  }

  // Discovery cards come from the lower half of the leaderboard, so the top
  // ranks always keep their numbers instead of being turned into tag cards.
  const poolStart = Math.ceil(ranked.length / 2);
  const pool = ranked.slice(poolStart);

  const trending = pool.filter((p) => isTrending(p));
  const newer = pool
    .filter((p) => isNew(p, now) && !isTrending(p))
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));

  // Build the discovery queue, alternating trending/new for variety and
  // falling back to whichever still has entries.
  const discovery: FeedSlot[] = [];
  let turn: "trending" | "new" = "trending";
  while (trending.length || newer.length) {
    const takeTrending = turn === "trending" ? trending.length > 0 : newer.length === 0;
    if (takeTrending && trending.length) {
      discovery.push({ photo: trending.shift()!, kind: "trending" });
    } else if (newer.length) {
      discovery.push({ photo: newer.shift()!, kind: "new" });
    }
    turn = turn === "trending" ? "new" : "trending";
  }

  // Everything not pulled into a discovery card stays a numbered card, in
  // ascending rank order (ranked is already sorted, so a filter preserves it).
  const usedInDiscovery = new Set(discovery.map((d) => d.photo.id));
  const numbered: FeedSlot[] = ranked
    .filter((p) => !usedInDiscovery.has(p.id))
    .map((photo) => ({ photo, kind: "ranked" as const }));

  // Interleave one discovery card after each numbered card until they run out,
  // then the remaining numbered cards continue in order.
  const order: FeedSlot[] = [];
  let d = 0;
  for (const slot of numbered) {
    order.push(slot);
    if (d < discovery.length) order.push(discovery[d++]);
  }
  while (d < discovery.length) order.push(discovery[d++]);

  return order;
}
