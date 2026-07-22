export default function Loading() {
  return (
    <main
      className="mx-auto flex h-full min-h-0 w-full max-w-md flex-col"
      aria-busy="true"
    >
      <span className="sr-only">Loading captions…</span>
      {/* Nav */}
      <div className="safe-top flex shrink-0 items-center justify-between border-b border-hairline px-4 py-1">
        <div className="size-11" />
        <div className="h-4 w-24 animate-pulse rounded bg-white/10" />
        <div className="size-11" />
      </div>
      {/* Photo thumb */}
      <div className="flex shrink-0 items-center justify-center border-b border-hairline py-4">
        <div className="size-[100px] animate-pulse bg-white/10" />
      </div>
      {/* Caption rows */}
      <div className="flex min-h-0 flex-1 flex-col">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-hairline px-6 py-4">
            <div className="h-4 w-3 animate-pulse rounded bg-white/10" />
            <div className="h-4 flex-1 animate-pulse rounded bg-white/10" />
            <div className="size-7 animate-pulse rounded-full bg-white/5" />
          </div>
        ))}
      </div>
    </main>
  );
}
