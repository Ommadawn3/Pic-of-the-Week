import { notFound } from "next/navigation";
import { HomeTemplate } from "@/components/templates/HomeTemplate";
import { getWeekById, getWeekFeed, getWeeks } from "@/lib/data/feed";
import { getUser } from "@/lib/auth";
import { buildWeekNavItems, weekStatusLabel } from "@/lib/week";

export const dynamic = "force-dynamic";

export default async function WeekPage({
  params,
}: {
  params: Promise<{ weekId: string }>;
}) {
  const { weekId } = await params;
  const week = await getWeekById(weekId);
  if (!week) notFound();

  const [weeks, photos, user] = await Promise.all([
    getWeeks(),
    getWeekFeed(week.id),
    getUser(),
  ]);

  return (
    <main className="mx-auto flex h-full min-h-0 w-full max-w-md flex-col">
      <HomeTemplate
        statusLabel={weekStatusLabel(week)}
        weeks={buildWeekNavItems(weeks, week.id)}
        photos={photos}
        isActiveWeek={week.status === "active"}
        weekId={week.id}
        isSignedIn={!!user}
      />
    </main>
  );
}
