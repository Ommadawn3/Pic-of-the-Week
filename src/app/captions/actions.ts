"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { CAPTION_MAX_LENGTH, LIMITS } from "@/lib/config";

export type ActionResult = { ok: true } | { ok: false; error: string };

const MAX_CAPTION = CAPTION_MAX_LENGTH;

export async function submitCaption(photoId: string, body: string): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Sign in to add a caption." };

  const trimmed = body.trim();
  if (!trimmed) return { ok: false, error: "Caption can't be empty." };
  if (trimmed.length > MAX_CAPTION)
    return { ok: false, error: `Caption must be ${MAX_CAPTION} characters or fewer.` };

  const supabase = await createClient();

  // Per-photo caption cap. Unlimited while LIMITS.captionsPerPhoto is null —
  // see src/lib/config.ts.
  if (LIMITS.captionsPerPhoto !== null) {
    const { count, error: countErr } = await supabase
      .from("captions")
      .select("id", { count: "exact", head: true })
      .eq("photo_id", photoId)
      .eq("author_user_id", user.id)
      .is("deleted_at", null);
    if (countErr) return { ok: false, error: countErr.message };
    if ((count ?? 0) >= LIMITS.captionsPerPhoto) {
      return {
        ok: false,
        error:
          LIMITS.captionsPerPhoto === 1
            ? "You've already added a caption to this photo."
            : `You've hit the limit of ${LIMITS.captionsPerPhoto} captions on this photo.`,
      };
    }
  }

  const { error } = await supabase
    .from("captions")
    .insert({ photo_id: photoId, author_user_id: user.id, body: trimmed });

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/`, "layout");
  return { ok: true };
}

export async function toggleVote(captionId: string): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Sign in to vote." };

  const supabase = await createClient();

  // Toggle: remove an existing vote, otherwise add one.
  const { data: existing } = await supabase
    .from("caption_votes")
    .select("id")
    .eq("caption_id", captionId)
    .eq("voter_user_id", user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("caption_votes").delete().eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase
      .from("caption_votes")
      .insert({ caption_id: captionId, voter_user_id: user.id });
    if (error) {
      // RLS blocks voting on your own caption.
      if (error.code === "42501" || error.code === "23514")
        return { ok: false, error: "You can't vote on your own caption." };
      if (error.code === "23505") return { ok: true }; // already voted (raced)
      return { ok: false, error: error.message };
    }
  }
  revalidatePath(`/`, "layout");
  return { ok: true };
}
