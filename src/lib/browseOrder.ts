import type { FeedPhoto } from "./types";

export type FeedSlot = {
  photo: FeedPhoto;
  /** Ranked slots show their number; discovery slots show a Hot/New tag. */
  kind: "ranked" | "hot" | "new";
};

/**
 * Builds the scroll order for the active week: the numbered leaderboard (validated
 * photos, in rank order) with discovery cards interleaved between them, alternating
 * Hot and New —
 *
 *   1, hot, 2, new, 3, hot, 4, new, …
 *
 * "Validated" (state === "ranked") means a photo has been seen by enough of the
 * week's viewers to earn a real rank; everything else is a discovery card that
 * keeps surfacing until it either validates onto the leaderboard or the week ends.
 * This is what gives new photos a chance to be seen without letting thin-data
 * photos claim a top rank.
 *
 * Archived weeks skip all of this and use plain rank order.
 */
export function buildBrowseOrder(
  ranked: FeedPhoto[],
  { isActiveWeek }: { isActiveWeek: boolean },
): FeedSlot[] {
  if (!isActiveWeek) {
    return ranked.map((photo) => ({ photo, kind: "ranked" as const }));
  }

  const numbered: FeedSlot[] = ranked
    .filter((p) => p.state === "ranked")
    .map((photo) => ({ photo, kind: "ranked" as const }));

  const hot: FeedSlot[] = ranked
    .filter((p) => p.state === "hot")
    .map((photo) => ({ photo, kind: "hot" as const }));
  const fresh: FeedSlot[] = ranked
    .filter((p) => p.state === "new")
    .map((photo) => ({ photo, kind: "new" as const }));

  // Discovery queue: alternate Hot / New, falling back to whichever still has
  // entries, so both keep appearing all week.
  const discovery: FeedSlot[] = [];
  let turn: "hot" | "new" = "hot";
  while (hot.length || fresh.length) {
    const takeHot = turn === "hot" ? hot.length > 0 : fresh.length === 0;
    if (takeHot && hot.length) discovery.push(hot.shift()!);
    else if (fresh.length) discovery.push(fresh.shift()!);
    turn = turn === "hot" ? "new" : "hot";
  }

  // One discovery card after each numbered card; leftovers of either run on.
  const order: FeedSlot[] = [];
  let d = 0;
  for (const slot of numbered) {
    order.push(slot);
    if (d < discovery.length) order.push(discovery[d++]);
  }
  while (d < discovery.length) order.push(discovery[d++]);

  return order;
}
