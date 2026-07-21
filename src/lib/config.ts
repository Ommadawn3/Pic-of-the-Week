/**
 * Participation limits. `null` = unlimited.
 *
 * These are intentionally unlimited right now so the contest is easy to test
 * and to seed early activity. As the userbase grows, set the env vars below
 * (most likely back to 1 and 1) to restore the one-photo-a-week / one-caption
 * -per-photo rules described in the PRD.
 *
 *   MAX_PHOTOS_PER_WEEK=1
 *   MAX_CAPTIONS_PER_PHOTO=1
 */
function limitFromEnv(name: string): number | null {
  const raw = process.env[name];
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}

export const LIMITS = {
  /** Photos one account may submit into a single contest week. */
  photosPerWeek: limitFromEnv("MAX_PHOTOS_PER_WEEK"),
  /** Captions one account may add to a single photo. */
  captionsPerPhoto: limitFromEnv("MAX_CAPTIONS_PER_PHOTO"),
} as const;

// Note: caption voting is NOT configurable — a user always backs at most one
// caption per photo. Voting a different caption moves the vote (enforced by
// the one_vote_per_photo trigger, migration 0008).

/**
 * Max caption length. Sized so a caption can't exceed THREE lines on the
 * polaroid card, whose caption block is a fixed 111px tall (Figma 191:3783).
 * The card also applies line-clamp-3 as a hard backstop, since character count
 * alone can't guarantee line count in a proportional font (e.g. all-caps).
 */
export const CAPTION_MAX_LENGTH = 105;
