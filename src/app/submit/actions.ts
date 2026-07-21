"use server";

import { randomUUID } from "node:crypto";
import { getActiveWeek } from "@/lib/data/feed";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { CAPTION_MAX_LENGTH, LIMITS } from "@/lib/config";

export type SubmitResult =
  | { ok: true; photoId: string }
  | { ok: false; error: string };

const MAX_CAPTION = CAPTION_MAX_LENGTH;

export async function submitPhoto(formData: FormData): Promise<SubmitResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "You need to be signed in to post." };

  const week = await getActiveWeek();
  if (!week) return { ok: false, error: "There's no active contest right now." };

  const firstName = String(formData.get("firstName") ?? "").trim();
  const initial = String(formData.get("initial") ?? "").trim() || null;
  const caption = String(formData.get("caption") ?? "").trim();
  const image = formData.get("image");

  if (!firstName) return { ok: false, error: "Please enter your first name." };
  if (!(image instanceof File) || image.size === 0)
    return { ok: false, error: "No photo was captured. Try again." };
  if (caption.length > MAX_CAPTION)
    return { ok: false, error: `Caption must be ${MAX_CAPTION} characters or fewer.` };

  const admin = createAdminClient();

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

  // Upload the captured image.
  const path = `${week.id}/${randomUUID()}.jpg`;
  const bytes = new Uint8Array(await image.arrayBuffer());
  const { error: uploadErr } = await admin.storage
    .from("photos")
    .upload(path, bytes, { contentType: "image/jpeg", upsert: false });
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

  return { ok: true, photoId: photo.id };
}
