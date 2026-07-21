import { createClient } from "@/lib/supabase/server";

export type CaptionRow = {
  id: string;
  body: string;
  author_user_id: string;
  vote_count: number;
  has_voted: boolean;
  is_author: boolean;
  rank: number;
  created_at: string;
};

export type PhotoHeader = {
  id: string;
  image_url: string;
  first_name: string;
  initial: string | null;
  contest_week_id: string;
};

export async function getPhotoHeader(photoId: string): Promise<PhotoHeader | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("photos")
    .select("id, image_url, first_name, initial, contest_week_id")
    .eq("id", photoId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getPhotoCaptions(photoId: string): Promise<CaptionRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_photo_captions", { p_photo_id: photoId });
  if (error) throw error;
  return (data ?? []) as CaptionRow[];
}
