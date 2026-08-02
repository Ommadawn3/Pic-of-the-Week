import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Records a clip replay (a deliberate tap). Each replay is worth 4s of view
// time in the ranking (see record_replay + photo_scores). Auth comes from the
// session cookie; anonymous callers are a no-op inside record_replay.
export async function POST(request: NextRequest) {
  let photoId: string | undefined;
  try {
    photoId = (await request.json()).photoId;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!photoId) return NextResponse.json({ ok: true });

  const supabase = await createClient();
  await supabase.rpc("record_replay", { p_photo_id: photoId });
  return NextResponse.json({ ok: true });
}
