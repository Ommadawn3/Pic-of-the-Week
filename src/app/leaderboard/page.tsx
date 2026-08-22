import Link from "next/link";
import Image from "next/image";
import { BottomNav } from "@/components/organisms/BottomNav";
import { getLeaderboard, type LeaderboardPeriod } from "@/lib/data/leaderboard";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

const PERIODS: { key: LeaderboardPeriod; label: string }[] = [
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
  { key: "all", label: "All time" },
];

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: raw } = await searchParams;
  const period: LeaderboardPeriod = raw === "year" || raw === "all" ? raw : "month";
  const rows = await getLeaderboard(period);

  return (
    <main className="relative flex h-full min-h-0 w-full flex-col">
      <div className="safe-top flex items-center justify-center border-b border-hairline px-6 py-4">
        <h1 className="font-marker text-2xl text-white">Leaderboard</h1>
      </div>

      <div className="flex justify-center gap-2 px-6 py-3">
        {PERIODS.map((p) => (
          <Link
            key={p.key}
            href={`/leaderboard?period=${p.key}`}
            aria-current={p.key === period ? "page" : undefined}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium",
              p.key === period ? "bg-white text-black" : "bg-white/10 text-white",
            )}
          >
            {p.label}
          </Link>
        ))}
      </div>

      <ul className="page-scroll flex min-h-0 flex-1 flex-col">
        {rows.length === 0 ? (
          <li className="px-6 py-16 text-center text-sm text-muted">
            No ranked photos in this period yet.
          </li>
        ) : (
          rows.map((r) => (
            <li key={r.photo_id}>
              <Link
                href={`/week/${r.contest_week_id}/photo/${r.photo_id}`}
                className="flex items-center gap-3 border-b border-hairline px-4 py-3 active:bg-white/5"
              >
                <span className="w-5 shrink-0 text-center text-sm font-semibold tabular-nums text-white">
                  {r.rank}
                </span>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-medium text-white">
                  {(r.first_name?.[0] ?? "?").toUpperCase()}
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm text-white">
                    {r.first_name}
                    {r.initial ? ` ${r.initial}` : ""}
                  </span>
                  <span className="text-xs text-muted">
                    {r.score.toFixed(1)}s · {r.drinks_count} drink{r.drinks_count === 1 ? "" : "s"}
                  </span>
                </div>
                <span className="relative size-10 shrink-0 overflow-hidden rounded-md bg-black">
                  {r.media_type === "clip" ? (
                    <video
                      src={r.image_url}
                      muted
                      playsInline
                      preload="metadata"
                      className="size-full object-cover"
                    />
                  ) : (
                    <Image
                      src={r.image_url}
                      alt=""
                      fill
                      sizes="40px"
                      className="object-cover"
                      unoptimized
                    />
                  )}
                </span>
              </Link>
            </li>
          ))
        )}
      </ul>

      <BottomNav />
    </main>
  );
}
