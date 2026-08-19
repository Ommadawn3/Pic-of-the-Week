"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getActiveWeek } from "@/lib/data/feed";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { CAPTION_MAX_LENGTH, LIMITS } from "@/lib/config";
import { ensureAppUser } from "@/lib/ensureAppUser";

export type SubmitResult =
  | { ok: true; photoId: string; weekId: string }
  | { ok: false; error: string };

const MAX_CAPTION = CAPTION_MAX_LENGTH;

export async function submitPhoto(formData: FormData): Promise<SubmitResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "You need to be signed in to post." };
  await ensureAppUser(user);

  const week = await getActiveWeek();
  if (!week) return { ok: false, error: "There's no active contest right now." };

  const admin = createAdminClient();

  let firstName = String(formData.get("firstName") ?? "").trim();
  let initial = String(formData.get("initial") ?? "").trim() || null;
  // Fall back to the name saved at first sign-in if the form didn't carry one.
  if (!firstName) {
    const { data: profile } = await admin
      .from("users")
      .select("first_name, initial")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.first_name) {
      firstName = profile.first_name;
      initial = initial ?? profile.initial ?? null;
    }
  }
  const caption = String(formData.get("caption") ?? "").trim();
  const media = formData.get("media");
  const mediaType = String(formData.get("mediaType") ?? "photo") === "clip" ? "clip" : "photo";
  const ext = String(formData.get("ext") ?? (mediaType === "clip" ? "mp4" : "jpg")).replace(/[^a-z0-9]/gi, "");
  // Optional; clamp to the DB's allowed range so a bad client can't reject the
  // whole insert on the check constraint.
  const drinksCount = Math.max(0, Math.min(50, Math.floor(Number(formData.get("drinks")) || 0)));

  if (!firstName) return { ok: false, error: "Please enter your first name." };
  if (!(media instanceof File) || media.size === 0)
    return { ok: false, error: `No ${mediaType} was captured. Try again.` };
  if (caption.length > MAX_CAPTION)
    return { ok: false, error: `Caption must be ${MAX_CAPTION} characters or fewer.` };

  // Per-week submission cap. Unlimited while LIMITS.photosPerWeek is null —
  // see src/lib/config.ts for how to re-tighten this as the userbase grows.
  if (LIMITS.photosPerWeek !== null) {
    const { count, error: countErr } = await admin
      .from("photos")
      .select("id", { count: "exact", head: true })
      .eq("contest_week_id", week.id)
      .eq("owner_user_id", user.id)
      .is("deleted_at", null);
    if (countErr) return { ok: false, error: countErr.message };
    if ((count ?? 0) >= LIMITS.photosPerWeek) {
      return {
        ok: false,
        error:
          LIMITS.photosPerWeek === 1
            ? "You've already posted this week. Come back next Wednesday!"
            : `You've hit this week's limit of ${LIMITS.photosPerWeek} photos.`,
      };
    }
  }

  // Upload the captured media (photo or clip) into the same bucket.
  const contentType = media.type || (mediaType === "clip" ? `video/${ext}` : "image/jpeg");
  const path = `${week.id}/${randomUUID()}.${ext}`;
  const bytes = new Uint8Array(await media.arrayBuffer());
  const { error: uploadErr } = await admin.storage
    .from("photos")
    .upload(path, bytes, { contentType, upsert: false });
  if (uploadErr) return { ok: false, error: uploadErr.message };

  const {
    data: { publicUrl },
  } = admin.storage.from("photos").getPublicUrl(path);

  // Photos are captured live; captured_at ~ now.
  const capturedAt = new Date().toISOString();
  const { data: photo, error: insertErr } = await admin
    .from("photos")
    .insert({
      contest_week_id: week.id,
      owner_user_id: user.id,
      image_url: publicUrl,
      first_name: firstName,
      initial,
      captured_at: capturedAt,
      drinks_count: drinksCount,
      media_type: mediaType,
    })
    .select("id")
    .single();

  if (insertErr) return { ok: false, error: insertErr.message };

  if (caption) {
    await admin.from("captions").insert({
      photo_id: photo.id,
      author_user_id: user.id,
      body: caption,
    });
  }

  // Refresh the feeds so the new photo is present the moment we land on it.
  revalidatePath("/");
  revalidatePath(`/week/${week.id}`);

  return { ok: true, photoId: photo.id, weekId: week.id };
}
