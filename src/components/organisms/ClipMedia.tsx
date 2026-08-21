"use client";

import { useEffect, useRef } from "react";

type ClipMediaProps = {
  src: string;
  /** Kept for call-site compatibility; not used now that replays aren't tracked. */
  photoId?: string;
  /** True when this card is the one resting in the feed. */
  isActive: boolean;
};

/**
 * A clip in the feed — a silent, auto-looping GIF-style loop. It plays on repeat
 * while its card is resting and pauses (resetting to the first frame) when
 * scrolled away. No tap-to-replay: people didn't replay, so it just loops.
 * Ranking is dwell-based (view_events), so looping has no scoring effect.
 */
export function ClipMedia({ src, isActive }: ClipMediaProps) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (isActive) {
      void v.play().catch(() => {});
    } else {
      v.pause();
      try {
        v.currentTime = 0;
      } catch {
        /* ignore */
      }
    }
  }, [isActive]);

  return (
    <video
      ref={ref}
      src={src}
      muted
      loop
      playsInline
      preload="auto"
      className="size-full object-cover"
    />
  );
}
