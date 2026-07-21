"use client";

import { useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

export type CalendarWeek = {
  id: string;
  label: string;
  isActive: boolean;
};

type CalendarControllerProps = {
  weeks: CalendarWeek[];
  onSelect: (id: string) => void;
  className?: string;
};

const SLIDE_MS = 420;
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

// Switching weeks is a route change, which remounts this component with a
// fresh DOM node scrolled to 0. Module scope (not a ref) survives that remount
// so we can restore the previous offset and ease from it — otherwise the dial
// would snap into place instead of sliding. A full page load re-inits the
// module, so the very first paint still positions instantly.
let lastScrollLeft: number | null = null;
let hasPositionedOnce = false;

/** Scroll `scroller` so `target` sits centred, easing out. */
function slideToCenter(scroller: HTMLElement, target: HTMLElement, animate: boolean) {
  const sRect = scroller.getBoundingClientRect();
  const tRect = target.getBoundingClientRect();
  const delta = tRect.left + tRect.width / 2 - (sRect.left + sRect.width / 2);
  const from = scroller.scrollLeft;
  const to = Math.max(0, Math.min(from + delta, scroller.scrollWidth - scroller.clientWidth));
  if (Math.abs(to - from) < 1) return;

  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!animate || reduced) {
    scroller.scrollLeft = to;
    return;
  }

  const start = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / SLIDE_MS);
    scroller.scrollLeft = from + (to - from) * easeOutCubic(t);
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function rememberScroll(el: HTMLElement) {
  lastScrollLeft = el.scrollLeft;
}

export function CalendarController({ weeks, onSelect, className }: CalendarControllerProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  const activeId = weeks.find((w) => w.isActive)?.id;

  // Centre the selected week. First paint positions instantly; afterwards the
  // dial eases out from wherever it was, including across a week-switch
  // navigation (see lastScrollLeft above).
  useEffect(() => {
    const scroller = scrollerRef.current;
    const active = activeRef.current;
    if (!scroller || !active) return;

    if (hasPositionedOnce && lastScrollLeft !== null) {
      scroller.scrollLeft = lastScrollLeft; // resume where the last view left off
    }

    const raf = requestAnimationFrame(() => {
      slideToCenter(scroller, active, hasPositionedOnce);
      hasPositionedOnce = true;
    });
    return () => cancelAnimationFrame(raf);
  }, [activeId]);

  // Slide immediately on tap so the dial responds before navigation lands.
  const handleSelect = useCallback(
    (id: string, el: HTMLButtonElement) => {
      const scroller = scrollerRef.current;
      if (scroller) slideToCenter(scroller, el, true);
      onSelect(id);
    },
    [onSelect],
  );

  return (
    <div
      ref={scrollerRef}
      onScroll={(e) => rememberScroll(e.currentTarget)}
      className={cn(
        "w-full overflow-x-auto border-t border-hairline [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {/* w-max so the row sizes to its content — without it the trailing 50%
          padding falls inside the parent's width and can't be scrolled into,
          leaving the last week stuck against the right edge. */}
      <div className="flex w-max items-center gap-5 py-4 pr-[50%] pl-[50%] whitespace-nowrap">
        {weeks.map((week, i) => (
          <div key={week.id} className="flex items-center gap-5">
            {i > 0 && <span className="size-0.5 shrink-0 rounded-full bg-muted-2" aria-hidden />}
            <button
              ref={week.isActive ? activeRef : undefined}
              type="button"
              onClick={(e) => handleSelect(week.id, e.currentTarget)}
              className={cn(
                "shrink-0 px-1 text-sm font-bold tracking-wide uppercase transition-colors duration-300",
                week.isActive ? "text-white" : "text-muted-2 hover:text-muted",
              )}
            >
              {week.label}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
