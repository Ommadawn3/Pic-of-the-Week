import { NextResponse, type NextRequest } from "next/server";
import { getWeekById, getWeekFeed } from "@/lib/data/feed";

/**
 * A single week's feed, used to swap weeks without a route change so the
 * header, week navigator and tool bar never unmount — only the photo area
 * reloads. The page routes still render the same data server-side for initial
 * loads, deep links, and no-JS.
 */
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/week/[weekId]/feed">) {
  const { weekId } = await ctx.params;

  const week = await getWeekById(weekId);
  if (!week) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const photos = await getWeekFeed(week.id);
  return NextResponse.json({ week, photos });
}
