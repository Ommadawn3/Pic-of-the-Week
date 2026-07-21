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

export async function getActiveWeek(): Promise<ContestWeek | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contest_weeks")
    .select("*")
    .eq("status", "active")
    .maybeSingle();
  if (error) throw error;
  return data;
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
