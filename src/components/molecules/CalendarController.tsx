"use client";

import { useEffect, useRef } from "react";
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

export function CalendarController({ weeks, onSelect, className }: CalendarControllerProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  const activeId = weeks.find((w) => w.isActive)?.id;

  // Keep the selected week horizontally centered in the scroller. Runs after a
  // frame so fonts/layout have settled — measuring too early leaves it at 0.
  useEffect(() => {
    const active = activeRef.current;
    if (!active) return;
    const raf = requestAnimationFrame(() => {
      active.scrollIntoView({ inline: "center", block: "nearest" });
    });
    return () => cancelAnimationFrame(raf);
  }, [activeId]);

  return (
    <div
      ref={scrollerRef}
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
              onClick={() => onSelect(week.id)}
              className={cn(
                "shrink-0 px-1 text-sm font-bold tracking-wide uppercase transition-colors",
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
