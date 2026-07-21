export type TagVariant = "leading" | "trending" | "new";

export type ContestWeek = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: "active" | "archived";
};

export type FeedPhoto = {
  id: string;
  contest_week_id: string;
  owner_user_id: string;
  image_url: string;
  first_name: string;
  initial: string | null;
  captured_at: string;
  created_at: string;
  score: number;
  viewer_count: number;
  rank: number;
  top_caption: string | null;
  caption_count: number;
};
