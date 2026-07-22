import { isNew, isTrending } from "./tags";
import type { FeedPhoto } from "./types";

export type FeedSlot = {
  photo: FeedPhoto;
  /** Ranked slots show their number; discovery slots show a tag instead. */
  kind: "ranked" | "trending" | "new";
};

/**
 * Builds the scroll order for the active week:
 *
 *   rank 1, trending, rank 2, new, rank 3, trending, rank 4, new, …
 *
 * The leaderboard is split up front: the top half fills the ranked slots so
 * their numbers stay consecutive (1, 2, 3, 4…), and the bottom half becomes
 * the discovery pool shown between them. Partitioning first is what keeps the
 * numbering clean — if discovery slots drew from the whole list they'd consume
 * rank 2 and the next ranked slot would jump to 3.
 *
 * Every photo appears exactly once. Archived weeks skip all of this and use
 * plain rank order.
 */
export function buildBrowseOrder(
  ranked: FeedPhoto[],
  { isActiveWeek, now = new Date() }: { isActiveWeek: boolean; now?: Date },
): FeedSlot[] {
  if (!isActiveWeek || ranked.length <= 2) {
    return ranked.map((photo) => ({ photo, kind: "ranked" as const }));
  }

  // Slots alternate ranked/discovery, so the top half carries the numbers.
  const rankedCount = Math.ceil(ranked.length / 2);
  const rankedStream = ranked.slice(0, rankedCount);
  const pool = ranked.slice(rankedCount);

  const trendingQueue = pool.filter((p) => isTrending(p));
  const newQueue = pool
    .filter((p) => isNew(p, now) && !isTrending(p))
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  // Anything in the pool that's neither: still needs to be seen, shown with
  // its rank rather than a tag it doesn't deserve.
  const leftovers = pool.filter((p) => !isTrending(p) && !isNew(p, now));

  const order: FeedSlot[] = [];
  let r = 0;
  let turn: "trending" | "new" = "trending";

  const takeDiscovery = (): FeedSlot | undefined => {
    const preferred = turn === "trending" ? trendingQueue : newQueue;
    const other = turn === "trending" ? newQueue : trendingQueue;
    const otherKind = turn === "trending" ? "new" : "trending";
    if (preferred.length) return { photo: preferred.shift()!, kind: turn };
    if (other.length) return { photo: other.shift()!, kind: otherKind };
    if (leftovers.length) return { photo: leftovers.shift()!, kind: "ranked" };
    return undefined;
  };

  while (r < rankedStream.length || trendingQueue.length || newQueue.length || leftovers.length) {
    if (r < rankedStream.length) {
      order.push({ photo: rankedStream[r++], kind: "ranked" });
    }
    const discovery = takeDiscovery();
    if (discovery) {
      order.push(discovery);
      turn = turn === "trending" ? "new" : "trending";
    } else if (r >= rankedStream.length) {
      break;
    }
  }

  return order;
}
