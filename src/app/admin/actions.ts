"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  clearAdminCookie,
  isAdmin,
  passwordMatches,
  setAdminCookie,
} from "@/lib/admin";

export async function adminLogin(_prev: unknown, formData: FormData): Promise<{ error?: string }> {
  const password = String(formData.get("password") ?? "");
  if (!passwordMatches(password)) {
    return { error: "Incorrect password." };
  }
  await setAdminCookie();
  redirect("/admin");
}

export async function adminLogout() {
  await clearAdminCookie();
  revalidatePath("/admin");
}

/** Soft-delete the reported target and mark all its reports resolved. */
export async function deleteTarget(
  targetType: "photo" | "caption",
  targetId: string,
): Promise<void> {
  if (!(await isAdmin())) return;
  const admin = createAdminClient();
  const table = targetType === "photo" ? "photos" : "captions";
  await admin.from(table).update({ deleted_at: new Date().toISOString() }).eq("id", targetId);
  await admin
    .from("reports")
    .update({ resolved_at: new Date().toISOString(), resolved_by: "admin" })
    .eq("target_type", targetType)
    .eq("target_id", targetId);
  revalidatePath("/admin");
  revalidatePath("/", "layout");
}

/** Dismiss all open reports for a target without deleting the content. */
export async function resolveReportsForTarget(
  targetType: "photo" | "caption",
  targetId: string,
): Promise<void> {
  if (!(await isAdmin())) return;
  const admin = createAdminClient();
  await admin
    .from("reports")
    .update({ resolved_at: new Date().toISOString(), resolved_by: "admin" })
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .is("resolved_at", null);
  revalidatePath("/admin");
}
