"use client";

import Link from "next/link";
import { Icon } from "@/components/atoms/Icon";
import { IconButton, iconButtonClass } from "@/components/atoms/IconButton";
import { cn } from "@/lib/cn";

type ToolContainerProps = {
  /** Undefined disables the action (e.g. an empty week has no active photo). */
  captionsHref?: string;
  captionCount?: number;
  submitHref: string;
  onShare?: () => void;
  onReport?: () => void;
  onInfo?: () => void;
};

/**
 * Bottom bar: five evenly spaced actions. The prev/next arrows are gone — the
 * feed is a vertical snap scroller now, so navigation is the scroll itself.
 */
export function ToolContainer({
  captionsHref,
  captionCount = 0,
  submitHref,
  onShare,
  onReport,
  onInfo,
}: ToolContainerProps) {
  return (
    <nav
      aria-label="Photo actions"
      className="safe-bottom flex w-full shrink-0 items-center justify-between px-6 pt-4 pb-4"
    >
      <IconButton aria-label="Report this photo" onClick={onReport} disabled={!onReport}>
        <Icon name="flag" />
      </IconButton>

      <IconButton aria-label="Share this photo" onClick={onShare} disabled={!onShare}>
        <Icon name="share" />
      </IconButton>

      <Link href={submitHref} aria-label="Submit a photo" className={iconButtonClass("accent")}>
        <Icon name="add" />
      </Link>

      {captionsHref ? (
        <Link
          href={captionsHref}
          aria-label={`View captions (${captionCount})`}
          className={cn(iconButtonClass("default"), "relative")}
        >
          <Icon name="comment" />
          {captionCount > 0 ? <CaptionBadge count={captionCount} /> : null}
        </Link>
      ) : (
        <IconButton aria-label="View captions" disabled>
          <Icon name="comment" />
        </IconButton>
      )}

      <IconButton aria-label="Photo stats" onClick={onInfo} disabled={!onInfo}>
        <Icon name="info" />
      </IconButton>
    </nav>
  );
}

function CaptionBadge({ count }: { count: number }) {
  return (
    <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-semibold text-white tabular-nums">
      {count > 99 ? "99+" : count}
    </span>
  );
}
