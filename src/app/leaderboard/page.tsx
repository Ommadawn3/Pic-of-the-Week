import { BottomNav } from "@/components/organisms/BottomNav";

export const dynamic = "force-dynamic";

// Placeholder — the real Month/Year/All-time leaderboard is the next build.
export default function LeaderboardPage() {
  return (
    <main className="relative flex h-full min-h-0 w-full flex-col">
      <div className="safe-top flex items-center justify-center border-b border-hairline px-6 py-4">
        <h1 className="font-marker text-2xl text-white">Leaderboard</h1>
      </div>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-8 text-center">
        <p className="font-marker text-xl text-white">Coming soon</p>
        <p className="text-sm text-muted">All-time standings, by view time and drinks.</p>
      </div>
      <BottomNav />
    </main>
  );
}
