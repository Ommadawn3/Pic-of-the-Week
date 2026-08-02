"use client";

import { useCallback, useEffect, useRef } from "react";
import { recordReplay } from "@/lib/recordReplay";

type ClipMediaProps = {
  src: string;
  photoId: string;
  /** True when this card is the one resting in the feed. */
  isActive: boolean;
};

/**
 * A clip in the feed. It auto-plays once (silently) when its card first rests,
 * then stops on the last frame. After that the viewer taps to replay — and only
 * those taps count toward ranking (+4s each via /api/replay); the initial
 * auto-play does not. Resets and pauses when scrolled away.
 */
export function ClipMedia({ src, photoId, isActive }: ClipMediaProps) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (isActive) {
      v.currentTime = 0;
      void v.play().catch(() => {}); // autoplay-on-rest; not a counted replay
    } else {
      v.pause();
      try {
        v.currentTime = 0;
      } catch {
        /* ignore */
      }
    }
  }, [isActive]);

  const replay = useCallback(() => {
    const v = ref.current;
    if (!v) return;
    // Read the element directly rather than the `playing` state: if an
    // ended/pause event were ever missed, state could get stuck true and
    // silently block every future replay. Ignore taps only while actually
    // mid-playback.
    if (!v.paused && !v.ended) return;
    v.currentTime = 0;
    void v.play().catch(() => {});
    recordReplay(photoId);
  }, [photoId]);

  return (
    <button
      type="button"
      onClick={replay}
      aria-label="Replay clip"
      className="relative block size-full"
    >
      <video
        ref={ref}
        src={src}
        muted
        playsInline
        preload="auto"
        className="size-full object-cover"
      />
    </button>
  );
}
