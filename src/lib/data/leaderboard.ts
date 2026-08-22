import { createClient } from "@/lib/supabase/server";

export type LeaderboardPeriod = "month" | "year" | "all";

export type LeaderboardRow = {
  photo_id: string;
  contest_week_id: string;
  image_url: string;
  first_name: string;
  initial: string | null;
  drinks_count: number;
  media_type: "photo" | "clip";
  score: number;
  viewer_count: number;
  rank: number;
};

/** Top validated photos over a time window — see migration 0020. */
export async function getLeaderboard(period: LeaderboardPeriod): Promise<LeaderboardRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_leaderboard", { period });
  if (error) throw error;
  return (data ?? []) as LeaderboardRow[];
}
