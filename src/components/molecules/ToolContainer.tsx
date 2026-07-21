"use client";

import Link from "next/link";
import { Icon } from "@/components/atoms/Icon";
import { IconButton, iconButtonClass } from "@/components/atoms/IconButton";

type ToolContainerProps = {
  onPrev?: () => void;
  onNext?: () => void;
  prevDisabled?: boolean;
  nextDisabled?: boolean;
  captionsHref: string;
  submitHref: string;
  onShare: () => void;
  /** Discreet report affordance, tucked under the left arrow. */
  reportSlot?: React.ReactNode;
};

export function ToolContainer({
  onPrev,
  onNext,
  prevDisabled,
  nextDisabled,
  captionsHref,
  submitHref,
  onShare,
  reportSlot,
}: ToolContainerProps) {
  return (
    // Side columns share a fixed width so the centre group stays optically
    // centred — without it the wider "Report" label under the left arrow
    // pushes the centre controls off to the right.
    <div className="flex w-full items-start justify-between px-6 pt-6 pb-4">
      <div className="flex w-[4.5rem] flex-col items-center gap-2">
        <IconButton aria-label="Previous photo" onClick={onPrev} disabled={prevDisabled}>
          <Icon name="arrow" direction="left" />
        </IconButton>
        {reportSlot}
      </div>

      <div className="flex items-center gap-4">
        <Link href={captionsHref} aria-label="View captions" className={iconButtonClass("default")}>
          <Icon name="comment" />
        </Link>
        <Link href={submitHref} aria-label="Submit a photo" className={iconButtonClass("accent")}>
          <Icon name="add" />
        </Link>
        <IconButton aria-label="Share this photo" onClick={onShare}>
          <Icon name="share" />
        </IconButton>
      </div>

      <div className="flex w-[4.5rem] flex-col items-center gap-2">
        <IconButton aria-label="Next photo" onClick={onNext} disabled={nextDisabled}>
          <Icon name="arrow" direction="right" />
        </IconButton>
      </div>
    </div>
  );
}
