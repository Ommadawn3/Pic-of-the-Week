"use client";

import Link from "next/link";
import { useState } from "react";
import { GlyphIcon } from "@/components/atoms/GlyphIcon";

type Props = {
  photoId: string;
  weekId: string;
  captionCount: number;
  viewerCount: number;
  mediaType: "photo" | "clip";
  imageUrl: string;
};

/**
 * The per-photo actions that live on the polaroid, under the caption — captions,
 * views, share, and save. They scroll with the card, so they read as belonging
 * to this photo rather than being app navigation.
 */
export function PhotoActionRow({
  photoId,
  weekId,
  captionCount,
  viewerCount,
  mediaType,
  imageUrl,
}: Props) {
  const [copied, setCopied] = useState(false);

  async function onShare() {
    const url = `${window.location.origin}/week/${weekId}/photo/${photoId}`;
    if (navigator.share) {
      try {
        await navigator.share({ url, title: "Pic of the Week" });
      } catch {
        /* user cancelled */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  async function onDownload() {
    // Best-effort save. iOS Safari may open the file instead of saving it —
    // that's an OS limit; the native share sheet (above) is the reliable path.
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = `pow-${photoId.slice(0, 8)}.${mediaType === "clip" ? "mp4" : "jpg"}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(href), 1000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex w-full items-center gap-5 border-t border-black/10 py-3 text-ink">
      <Link
        href={`/week/${weekId}/photo/${photoId}/captions`}
        aria-label={`Captions (${captionCount})`}
        className="flex items-center gap-1.5 active:opacity-60"
      >
        <GlyphIcon name="comment" size={22} />
        <span className="text-sm tabular-nums">{captionCount}</span>
      </Link>

      <span aria-label={`${viewerCount} viewers`} className="flex items-center gap-1.5">
        <GlyphIcon name="eye" size={22} />
        <span className="text-sm tabular-nums">{viewerCount}</span>
      </span>

      <button
        type="button"
        onClick={onShare}
        aria-label="Share"
        className="flex items-center gap-1.5 active:opacity-60"
      >
        <GlyphIcon name="share" size={22} />
        {copied ? <span className="text-xs text-muted">Copied</span> : null}
      </button>

      <button
        type="button"
        onClick={onDownload}
        aria-label="Save"
        className="ml-auto flex items-center active:opacity-60"
      >
        <GlyphIcon name="download" size={22} />
      </button>
    </div>
  );
}
