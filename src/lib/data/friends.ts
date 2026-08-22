import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUser } from "@/lib/auth";

/** The signed-in user's friends' ids (empty when signed out). */
export async function getFriendIds(): Promise<string[]> {
  const user = await getUser();
  if (!user) return [];
  const supabase = await createClient();
  // RLS returns only the caller's friendship rows.
  const { data } = await supabase.from("friendships").select("user_a, user_b");
  return (data ?? []).map((r) => (r.user_a === user.id ? r.user_b : r.user_a));
}

/** Whether the signed-in user is already friends with `targetId`. */
export async function isFriendOf(targetId: string): Promise<boolean> {
  const ids = await getFriendIds();
  return ids.includes(targetId);
}

/**
 * Another user's public display name — read with the admin client because the
 * users RLS policy only exposes a person their own row.
 */
export async function getPublicUser(
  userId: string,
): Promise<{ firstName: string | null; initial: string | null } | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("users")
    .select("first_name, initial")
    .eq("id", userId)
    .maybeSingle();
  if (!data) return null;
  return { firstName: data.first_name, initial: data.initial };
}
