"use server";

import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { ensureAppUser } from "@/lib/ensureAppUser";

export type ReportResult = { ok: true } | { ok: false; error: string };

export async function reportContent(
  targetType: "photo" | "caption",
  targetId: string,
  reason?: string,
): Promise<ReportResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Sign in to report content." };
  await ensureAppUser(user);

  const supabase = await createClient();
  const { error } = await supabase.from("reports").insert({
    target_type: targetType,
    target_id: targetId,
    reporter_user_id: user.id,
    reason: reason?.trim() || null,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
