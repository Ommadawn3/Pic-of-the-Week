import { redirect } from "next/navigation";
import { HomeTemplate } from "@/components/templates/HomeTemplate";
import { getActiveWeek, getWeekFeed, getWeeks } from "@/lib/data/feed";
import { getUser } from "@/lib/auth";
import { buildWeekNavItems, weekStatusLabel } from "@/lib/week";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const activeWeek = await getActiveWeek();

  if (!activeWeek) {
    // No active week yet — fall back to the most recent week if one exists.
    const weeks = await getWeeks();
    if (weeks.length > 0) redirect(`/week/${weeks[0].id}`);
    return (
      <main className="mx-auto flex min-h-full w-full max-w-md flex-1 items-center justify-center p-8 text-center">
        <p className="text-muted">No contest has started yet. Check back soon.</p>
      </main>
    );
  }

  const [weeks, photos, user] = await Promise.all([
    getWeeks(),
    getWeekFeed(activeWeek.id),
    getUser(),
  ]);

  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col">
      <HomeTemplate
        statusLabel={weekStatusLabel(activeWeek)}
        weeks={buildWeekNavItems(weeks, activeWeek.id)}
        photos={photos}
        isActiveWeek
        weekId={activeWeek.id}
        isSignedIn={!!user}
      />
    </main>
  );
}
