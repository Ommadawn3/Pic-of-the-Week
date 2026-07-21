"use client";

import { useEffect } from "react";

export function Toast({
  message,
  onDone,
  duration = 2500,
}: {
  message: string;
  onDone: () => void;
  duration?: number;
}) {
  useEffect(() => {
    const t = setTimeout(onDone, duration);
    return () => clearTimeout(t);
  }, [onDone, duration]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-28 z-50 flex justify-center px-6">
      <div className="flex items-center gap-3 rounded-full bg-rank/95 px-5 py-3 text-sm text-white shadow-lg">
        <span className="flex size-5 items-center justify-center rounded-full bg-accent text-xs">
          ✓
        </span>
        {message}
      </div>
    </div>
  );
}
