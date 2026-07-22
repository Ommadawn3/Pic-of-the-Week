import { createAdminClient } from "@/lib/supabase/admin";
import type { User } from "@supabase/supabase-js";

/**
 * Guarantees the signed-in account has a row in public.users before we insert
 * anything that references it.
 *
 * A DB trigger normally provisions this at sign-up, but a real user once got
 * through auth without the row existing and every submit failed with
 * "violates foreign key constraint photos_owner_user_id_fkey". Auth succeeding
 * while posting is impossible is a bad failure mode, so write paths self-heal
 * rather than trusting the trigger fired.
 */
export async function ensureAppUser(user: User): Promise<void> {
  const admin = createAdminClient();
  await admin.from("users").upsert(
    {
      id: user.id,
      email: user.email ?? `${user.id}@unknown.local`,
    },
    { onConflict: "id", ignoreDuplicates: true },
  );
}
