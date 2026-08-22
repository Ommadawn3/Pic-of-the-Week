"use client";

import { useRouter } from "next/navigation";
import { GlyphIcon } from "@/components/atoms/GlyphIcon";

/**
 * Floating control on the right edge: jumps the feed back to the top and pulls
 * fresh data. One button covers both "get me back up" and "refresh".
 */
export function ScrollTopButton() {
  const router = useRouter();

  function onClick() {
    document.querySelector('[role="feed"]')?.scrollTo({ top: 0, behavior: "smooth" });
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Back to top and refresh"
      className="absolute top-1/2 right-2 z-30 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/70 text-white backdrop-blur active:scale-95"
    >
      <GlyphIcon name="arrow-up" size={22} />
    </button>
  );
}
