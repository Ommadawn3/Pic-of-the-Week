"use client";

import { useEffect } from "react";
import { Button } from "@/components/atoms/Button";
import { VIEW_TIME_LABEL, formatViewTime } from "@/lib/score";
import type { FeedPhoto } from "@/lib/types";

/**
 * Stats overlay for the photo currently on screen. The view-time figure is
 * labelled from a single constant (see lib/score.ts) because the scoring
 * metric itself is still being worked out — when it changes, the wording
 * changes in one place.
 */
export function InfoOverlay({ photo, onClose }: { photo: FeedPhoto; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Photo stats"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xs rounded-3xl bg-[#1c1c1c] p-6"
      >
        <h2 className="font-marker text-2xl text-white">How it&apos;s doing</h2>

        <dl className="mt-4 flex flex-col gap-3">
          <Row label="Current rank" value={`#${photo.rank}`} />
          <Row label={VIEW_TIME_LABEL} value={formatViewTime(photo.score)} />
          <Row label="People who looked" value={String(photo.viewer_count)} />
          <Row label="Captions" value={String(photo.caption_count)} />
        </dl>

        <p className="mt-4 text-xs leading-snug text-muted">
          Photos rank by how long people actually look — no likes, no algorithm.
          Each view counts up to 2 minutes.
        </p>

        <Button onClick={onClose} className="mt-5 w-full">
          Got it
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-lg font-medium text-white tabular-nums">{value}</dd>
    </div>
  );
}
