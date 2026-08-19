"use server";

import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureAppUser } from "@/lib/ensureAppUser";

export type SaveNameResult = { ok: true } | { ok: false; error: string };

/** Persist the user's display name once, at first sign-in. */
export async function saveName(firstName: string, initial: string): Promise<SaveNameResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "You need to be signed in." };

  const name = firstName.trim();
  const init = initial.trim().slice(0, 1) || null;
  if (!name) return { ok: false, error: "Please enter your first name." };

  await ensureAppUser(user);
  const admin = createAdminClient();
  const { error } = await admin
    .from("users")
    .update({ first_name: name.slice(0, 40), initial: init })
    .eq("id", user.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
