import { createClient } from "@/lib/supabase/server";
import type { ContestWeek, FeedPhoto } from "@/lib/types";

/** All contest weeks, newest first. Used to build the week navigator. */
export async function getWeeks(): Promise<ContestWeek[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contest_weeks")
    .select("*")
    .order("starts_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/**
 * The current contest week, starting the next one if the last has ended.
 *
 * Rollover is on-demand rather than cron-only: a weekly cron leaves the site
 * stuck on an expired week (showing "Ended", nobody able to submit) if a week
 * closes at any other time or a run is missed. ensure_active_week() is
 * idempotent and race-safe, so calling it per request is cheap and self-heals.
 */
export async function getActiveWeek(): Promise<ContestWeek | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("ensure_active_week");
  if (error) throw error;
  // Composite-returning RPCs come back as a single row (or an array of one).
  const week = Array.isArray(data) ? data[0] : data;
  return (week as ContestWeek) ?? null;
}

export async function getWeekById(id: string): Promise<ContestWeek | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contest_weeks")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Ranked feed for a week: photos ordered by view-time score, with top caption. */
export async function getWeekFeed(weekId: string): Promise<FeedPhoto[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_week_feed", { week_id: weekId });
  if (error) throw error;
  return (data ?? []) as FeedPhoto[];
}
