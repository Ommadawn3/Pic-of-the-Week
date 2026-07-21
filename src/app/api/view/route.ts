import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Records a view. Kept as a route handler (not a server action) so the client
// can flush with fetch keepalive / sendBeacon on page unload without the
// request being cancelled. Auth comes from the session cookie; anonymous
// callers are a no-op inside record_view.
export async function POST(request: NextRequest) {
  let photoId: string | undefined;
  let seconds: number | undefined;
  try {
    const body = await request.json();
    photoId = body.photoId;
    seconds = Number(body.seconds);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!photoId || !Number.isFinite(seconds) || (seconds ?? 0) <= 0) {
    return NextResponse.json({ ok: true });
  }

  const supabase = await createClient();
  await supabase.rpc("record_view", { p_photo_id: photoId, p_seconds: seconds });
  return NextResponse.json({ ok: true });
}
