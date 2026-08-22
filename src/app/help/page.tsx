import { BottomNav } from "@/components/organisms/BottomNav";

export const dynamic = "force-dynamic";

// Placeholder — house rules / how scoring works will live here.
export default function HelpPage() {
  return (
    <main className="relative flex h-full min-h-0 w-full flex-col">
      <div className="safe-top flex items-center justify-center border-b border-hairline px-6 py-4">
        <h1 className="font-marker text-2xl text-white">Help</h1>
      </div>
      <div className="page-scroll flex min-h-0 flex-1 flex-col gap-5 px-6 py-6 text-sm text-muted">
        <p>
          <span className="text-white">Pic of the Week</span> is a weekly photo and clip contest.
          Post one shot; it&apos;s ranked by how long people actually look, not likes.
        </p>
        <p>A new week starts every Wednesday. Add captions, vote on the funniest, and check the board.</p>
      </div>
      <BottomNav />
    </main>
  );
}
