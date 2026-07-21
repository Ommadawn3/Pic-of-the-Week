import Image from "next/image";
import { RankBadge } from "@/components/atoms/RankBadge";
import { Tag, type TagVariant } from "@/components/atoms/Tag";

type PolaroidPhotoCardProps = {
  imageUrl: string;
  rank: number;
  tag?: TagVariant;
  topCaption?: string;
  authorName: string;
  capturedAtLabel: string;
};

export function PolaroidPhotoCard({
  imageUrl,
  rank,
  tag,
  topCaption,
  authorName,
  capturedAtLabel,
}: PolaroidPhotoCardProps) {
  return (
    <div className="flex w-full flex-col items-start bg-paper px-5 pt-5">
      <div className="relative aspect-square w-full">
        <Image
          src={imageUrl}
          alt={topCaption ?? `Photo by ${authorName}`}
          fill
          className="pointer-events-none object-cover"
          sizes="402px"
        />
        <div className="absolute top-0 left-0 flex items-center">
          <RankBadge rank={rank} />
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
