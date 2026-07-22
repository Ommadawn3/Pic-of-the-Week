"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { PolaroidPhotoCard } from "@/components/organisms/PolaroidPhotoCard";
import { formatCapturedAt } from "@/lib/week";
import type { FeedSlot } from "@/lib/browseOrder";

/** Images fetched eagerly beyond the active card. */
const PRELOAD_AHEAD = 5;
/** Cards mounted either side of the active one once windowing kicks in. */
const RENDER_RADIUS = 6;
/** Below this many photos, just mount everything. */
const WINDOW_THRESHOLD = 40;

type FeedScrollerProps = {
  slots: FeedSlot[];
  initialIndex: number;
  onActiveChange: (index: number) => void;
};

/**
 * Vertical, TikTok-style feed. Uses native CSS scroll-snap rather than a
 * JS-driven animation so scrolling stays on the compositor and doesn't drop
 * frames.
 */
export function FeedScroller({ slots, initialIndex, onActiveChange }: FeedScrollerProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const readyRef = useRef(false);
  const [active, setActive] = useState(initialIndex);

  // Jump to a deep-linked card before paint. readyRef suppresses the observer
  // until the jump has settled — otherwise opening a share link to card #12
  // fires the observer for card #0 on the way past and records a view for a
  // photo the user never actually saw.
  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    if (initialIndex > 0) el.scrollTop = initialIndex * el.clientHeight;
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        readyRef.current = true;
      });
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
    // Deliberately mount-only: re-running would yank the user's scroll position.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const i = Number((e.target as HTMLElement).dataset.index);
          if (Number.isNaN(i)) continue;
          setActive(i);
          if (readyRef.current) onActiveChange(i);
        }
      },
      // Items are full-height, so at 0.6 at most one can ever qualify.
      { root, threshold: 0.6 },
    );
    // Observe the wrappers, which stay mounted even when their card is
    // windowed out — observing the cards would break under windowing.
    itemRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [slots.length, onActiveChange]);

  const setItemRef = useCallback(
    (i: number) => (el: HTMLElement | null) => {
      itemRefs.current[i] = el;
    },
    [],
  );

  const windowed = slots.length > WINDOW_THRESHOLD;

  return (
    <div
      ref={scrollerRef}
      role="feed"
      aria-label="Photos this week"
      tabIndex={0}
      className="min-h-0 flex-1 snap-y snap-mandatory overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch] [scrollbar-width:none] focus:outline-none [&::-webkit-scrollbar]:hidden"
    >
      {slots.map(({ photo, kind }, i) => {
        // Wrappers are always rendered at full height so scroll height and
        // snap points never shift as cards mount/unmount.
        const mounted = !windowed || Math.abs(i - active) <= RENDER_RADIUS;
        return (
          <article
            key={photo.id}
            ref={setItemRef(i)}
            data-index={i}
            aria-posinset={i + 1}
            aria-setsize={slots.length}
            // snap-always is what stops a hard fling from flying through a
            // dozen cards and crediting each one with a view.
            className="flex h-full w-full snap-start snap-always items-center justify-center"
          >
            {mounted ? (
              <PolaroidPhotoCard
                imageUrl={photo.image_url}
                rank={kind === "ranked" ? photo.rank : undefined}
                tag={kind === "ranked" ? undefined : kind}
                topCaption={photo.top_caption ?? undefined}
                authorName={
                  photo.initial ? `${photo.first_name} ${photo.initial}` : photo.first_name
                }
                capturedAtLabel={formatCapturedAt(photo.captured_at)}
                priority={i === initialIndex}
                eager={i > active && i <= active + PRELOAD_AHEAD}
              />
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
