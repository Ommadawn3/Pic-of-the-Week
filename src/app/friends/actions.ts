"use server";

import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type FriendResult = { ok: true } | { ok: false; error: string };

export async function addFriend(targetId: string): Promise<FriendResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Sign in to add friends." };
  if (targetId === user.id) return { ok: false, error: "That's you!" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("add_friend", { target: targetId });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function removeFriend(targetId: string): Promise<FriendResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Sign in first." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_friend", { target: targetId });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
