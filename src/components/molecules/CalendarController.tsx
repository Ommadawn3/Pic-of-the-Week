"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

export type CalendarWeek = {
  id: string;
  label: string;
  isActive: boolean;
  /** Prefetch target so switching weeks feels instant. */
  href?: string;
};

type CalendarControllerProps = {
  weeks: CalendarWeek[];
  /** Optional side-effect on tap. Navigation is the Link's job — don't push
   *  from here or the route change fires twice. */
  onSelect?: (id: string) => void;
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
  const activeRef = useRef<HTMLAnchorElement>(null);
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

  const handleSelect = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
      const scroller = scrollerRef.current;
      if (scroller) slideToCenter(scroller, e.currentTarget, true);

      // With a handler attached we swap the week in place, so suppress the
      // Link's navigation. Modified clicks (new tab/window) are left alone,
      // and without a handler the href still works as a normal link.
      const modified = e.metaKey || e.ctrlKey || e.shiftKey || e.altKey;
      if (onSelect && !modified) {
        e.preventDefault();
        onSelect(id);
      }
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
      {/* Flat row with a single gap so spacing is a uniform 16px between every
          label and dot. Nesting each week in its own flex doubled the gap. */}
      <div className="flex w-max items-center gap-4 py-4 pr-[50%] pl-[50%] whitespace-nowrap">
        {weeks.map((week, i) => (
          <Fragment key={week.id}>
            {i > 0 && <span className="size-0.5 shrink-0 rounded-full bg-muted-2" aria-hidden />}
            {/* Link (not button) so Next prefetches each week's shell —
                every week chip is on screen, so switching feels instant.
                onClick still drives the slide animation. */}
            <Link
              ref={week.isActive ? activeRef : undefined}
              href={week.href ?? `/week/${week.id}`}
              onClick={(e) => handleSelect(e, week.id)}
              className={cn(
                "shrink-0 text-sm font-bold tracking-wide uppercase transition-colors duration-300",
                week.isActive ? "text-white" : "text-muted-2 hover:text-muted",
              )}
            >
              {week.label}
            </Link>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
