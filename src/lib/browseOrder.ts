import type { FeedPhoto } from "./types";

/**
 * Builds the swipe order for the active week. The list comes in ranked by
 * score; we interleave recent uploads into that order so new submissions get
 * seen as the week progresses instead of being buried (PRD §4.3). Archived
 * weeks skip this and just use rank order.
 *
 * Pattern: every `recentEvery`-th slot pulls the newest not-yet-shown photo;
 * other slots pull the next-highest-ranked not-yet-shown photo.
 */
export function buildBrowseOrder(
  ranked: FeedPhoto[],
  { isActiveWeek, recentEvery = 4 }: { isActiveWeek: boolean; recentEvery?: number },
): FeedPhoto[] {
  if (!isActiveWeek || ranked.length <= 2) return ranked;

  const byRank = [...ranked]; // already rank-ordered
  const byRecent = [...ranked].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  const order: FeedPhoto[] = [];
  const used = new Set<string>();
  let rankIdx = 0;
  let recentIdx = 0;

  const nextRanked = () => {
    while (rankIdx < byRank.length && used.has(byRank[rankIdx].id)) rankIdx++;
    return rankIdx < byRank.length ? byRank[rankIdx] : undefined;
  };
  const nextRecent = () => {
    while (recentIdx < byRecent.length && used.has(byRecent[recentIdx].id)) recentIdx++;
    return recentIdx < byRecent.length ? byRecent[recentIdx] : undefined;
  };

  for (let slot = 0; order.length < ranked.length; slot++) {
    const wantRecent = slot > 0 && slot % recentEvery === recentEvery - 1;
    const pick = (wantRecent ? nextRecent() : nextRanked()) ?? nextRanked() ?? nextRecent();
    if (!pick) break;
    order.push(pick);
    used.add(pick.id);
  }

  return order;
}
