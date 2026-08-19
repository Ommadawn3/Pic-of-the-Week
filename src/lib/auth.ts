import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

/** The currently signed-in user, or null. Safe to call in server components. */
export async function getUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export type AppProfile = { firstName: string | null; initial: string | null };

/**
 * The signed-in user's saved display name (set once at first sign-in, reused on
 * every submission). Returns null when signed out. `firstName === null` means the
 * user hasn't picked a name yet and should be sent through /welcome.
 */
export async function getAppProfile(): Promise<AppProfile | null> {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  // RLS policy "users can read their own row" makes this safe without admin.
  const { data } = await supabase
    .from("users")
    .select("first_name, initial")
    .eq("id", user.id)
    .maybeSingle();
  return { firstName: data?.first_name ?? null, initial: data?.initial ?? null };
}
