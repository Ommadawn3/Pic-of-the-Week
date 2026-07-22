/**
 * Ghost state for the feed. Geometry mirrors the real shell exactly — nav
 * height, calendar strip, the polaroid's square image + fixed 111px caption
 * block, and the tool bar — so swapping in real content is a texture change
 * rather than a layout shift.
 */
export function FeedSkeleton() {
  return (
    <div className="flex h-full min-h-0 w-full flex-col" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading photos…</span>

      {/* Home nav */}
      <div className="safe-top flex w-full shrink-0 items-center justify-between px-6 py-3.5">
        <div className="h-9 w-44 animate-pulse rounded bg-white/10" />
        <div className="h-8 w-24 animate-pulse rounded-full bg-white/5" />
      </div>

      {/* Calendar strip */}
      <div className="flex w-full shrink-0 justify-center border-t border-hairline py-4">
        <div className="h-4 w-32 animate-pulse rounded bg-white/10" />
      </div>

      {/* Card */}
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <PolaroidSkeleton />
      </div>

      {/* Tool bar */}
      <div className="safe-bottom flex w-full shrink-0 items-center justify-between px-6 pt-4 pb-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="size-12 animate-pulse rounded-full bg-white/5" />
        ))}
      </div>
    </div>
  );
}

export function PolaroidSkeleton() {
  return (
    <div className="flex w-full flex-col items-start bg-paper px-5 pt-5">
      <div className="aspect-square w-full animate-pulse bg-black/10" />
      {/* Same fixed 111px block as the real card — see PolaroidPhotoCard. */}
      <div className="flex h-[111px] w-full flex-col items-center justify-center gap-2">
        <div className="h-4 w-3/5 animate-pulse rounded bg-black/10" />
        <div className="h-3 w-2/5 animate-pulse rounded bg-black/5" />
      </div>
    </div>
  );
}
