import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Weekly contest rollover, triggered by Vercel Cron (see vercel.json).
// Secured with CRON_SECRET: Vercel automatically sends it as a Bearer token
// when the env var is set. Also runnable manually with the same header.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("rollover_contest_week");
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, result: data });
}
