import { memo } from "react";
import Image from "next/image";
import { RankBadge } from "@/components/atoms/RankBadge";
import { Tag } from "@/components/atoms/Tag";
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
}: PolaroidPhotoCardProps) {
  return (
    <div className="flex w-full flex-col items-start bg-paper px-5 pt-5">
      <div className="relative aspect-square w-full">
        <Image
          src={imageUrl}
          alt={topCaption ?? `Photo by ${authorName}`}
          fill
          className="pointer-events-none object-cover"
          sizes="(max-width: 448px) 100vw, 402px"
          priority={priority}
          loading={priority ? undefined : eager ? "eager" : "lazy"}
        />
        <div className="absolute top-0 left-0 flex items-center">
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
      <div className="flex h-[111px] w-full flex-col items-center justify-center gap-1 text-center">
        {topCaption ? (
          <p className="line-clamp-3 font-marker text-[18px] leading-[100%] text-ink">
            {topCaption}
          </p>
        ) : null}
        <p className="text-sm text-muted">
          {authorName}, {capturedAtLabel}
        </p>
      </div>
    </div>
  );
}

// Memoised: the feed re-renders on every snap, and without this each scroll
// re-renders every mounted card and drops frames.
export const PolaroidPhotoCard = memo(PolaroidPhotoCardImpl);
