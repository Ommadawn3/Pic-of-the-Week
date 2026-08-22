import { memo } from "react";
import Image from "next/image";
import { RankBadge } from "@/components/atoms/RankBadge";
import { Tag } from "@/components/atoms/Tag";
import { ClipMedia } from "@/components/organisms/ClipMedia";
import { PhotoActionRow } from "@/components/organisms/PhotoActionRow";
import type { TagVariant } from "@/lib/types";

type PolaroidPhotoCardProps = {
  imageUrl: string;
  /** Omit on discovery slots — those identify themselves with a tag instead. */
  rank?: number;
  tag?: TagVariant;
  topCaption?: string;
  authorName: string;
  capturedAtLabel: string;
  /** LCP hint. Exactly one card in the feed should set this. */
  priority?: boolean;
  /** Fetch immediately rather than lazily (used to preload cards just ahead). */
  eager?: boolean;
  /** "clip" renders a video with play-on-rest + tap-to-replay. */
  mediaType?: "photo" | "clip";
  /** Needed for clips: the photo id (replays) and whether this card is resting. */
  photoId?: string;
  isActive?: boolean;
  /** Powers the per-photo action row (captions/views/share/save) under the caption. */
  weekId?: string;
  captionCount?: number;
  viewerCount?: number;
};

function PolaroidPhotoCardImpl({
  imageUrl,
  rank,
  tag,
  topCaption,
  authorName,
  capturedAtLabel,
  priority,
  eager,
  mediaType = "photo",
  photoId,
  isActive,
  weekId,
  captionCount = 0,
  viewerCount = 0,
}: PolaroidPhotoCardProps) {
  return (
    // The white polaroid frame runs to the screen edges (no dark side gap), with
    // the photo inset by the paper border on all sides — a real polaroid look.
    <div className="flex w-full flex-col items-start bg-paper px-5 pt-5 pb-2">
      <div className="relative aspect-square w-full overflow-hidden">
        {mediaType === "clip" && photoId ? (
          <ClipMedia src={imageUrl} photoId={photoId} isActive={!!isActive} />
        ) : (
          <Image
            src={imageUrl}
            alt={topCaption ?? `Photo by ${authorName}`}
            fill
            className="pointer-events-none object-cover"
            sizes="(max-width: 448px) 100vw, 402px"
            priority={priority}
            loading={priority ? undefined : eager ? "eager" : "lazy"}
          />
        )}
        <div className="pointer-events-none absolute top-0 left-0 flex items-center">
          {rank !== undefined ? <RankBadge rank={rank} /> : null}
          {tag ? <Tag variant={tag} /> : null}
        </div>
      </div>
      {/* Fixed 111px per Figma 191:3783 — the photo above never changes height.
          A multi-line caption stays centred and simply eats the slack above and
          below rather than growing the card. line-clamp-3 is the hard backstop
          on line count (CAPTION_MAX_LENGTH handles the normal case).
          Line height is a deliberate 100%, not Figma's 78.96% — that measured
          too cramped in practice, and three lines still fit the 111px block
          comfortably. Don't "correct" it back to the Figma value. */}
      <div className="flex min-h-[88px] w-full flex-col items-center justify-center gap-1 py-2 text-center">
        {topCaption ? (
          <p className="line-clamp-3 font-marker text-[18px] leading-[100%] text-ink">
            {topCaption}
          </p>
        ) : null}
        <p className="text-sm text-muted">
          {authorName}, {capturedAtLabel}
        </p>
      </div>

      {photoId && weekId ? (
        <PhotoActionRow
          photoId={photoId}
          weekId={weekId}
          captionCount={captionCount}
          viewerCount={viewerCount}
          mediaType={mediaType}
          imageUrl={imageUrl}
        />
      ) : null}
    </div>
  );
}

// Memoised: the feed re-renders on every snap, and without this each scroll
// re-renders every mounted card and drops frames.
export const PolaroidPhotoCard = memo(PolaroidPhotoCardImpl);
