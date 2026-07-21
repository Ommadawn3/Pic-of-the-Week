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
