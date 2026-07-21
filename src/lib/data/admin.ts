import { createAdminClient } from "@/lib/supabase/admin";

export type ReportItem = {
  targetType: "photo" | "caption";
  targetId: string;
  reportCount: number;
  reasons: string[];
  lastReportedAt: string;
  // content preview (null if already deleted)
  photo?: { image_url: string; first_name: string } | null;
  caption?: { body: string } | null;
  alreadyDeleted: boolean;
};

/** Open (unresolved) reports, grouped by the content they target. */
export async function getOpenReports(): Promise<ReportItem[]> {
  const admin = createAdminClient();
  const { data: reports, error } = await admin
    .from("reports")
    .select("target_type, target_id, reason, created_at")
    .is("resolved_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!reports || reports.length === 0) return [];

  // Group by target.
  const groups = new Map<string, ReportItem>();
  for (const r of reports) {
    const key = `${r.target_type}:${r.target_id}`;
    const existing = groups.get(key);
    if (existing) {
      existing.reportCount += 1;
      if (r.reason) existing.reasons.push(r.reason);
    } else {
      groups.set(key, {
        targetType: r.target_type,
        targetId: r.target_id,
        reportCount: 1,
        reasons: r.reason ? [r.reason] : [],
        lastReportedAt: r.created_at,
        alreadyDeleted: false,
      });
    }
  }

  const items = [...groups.values()];
  const photoIds = items.filter((i) => i.targetType === "photo").map((i) => i.targetId);
  const captionIds = items.filter((i) => i.targetType === "caption").map((i) => i.targetId);

  if (photoIds.length) {
    const { data } = await admin
      .from("photos")
      .select("id, image_url, first_name, deleted_at")
      .in("id", photoIds);
    const byId = new Map((data ?? []).map((p) => [p.id, p]));
    for (const item of items) {
      if (item.targetType !== "photo") continue;
      const p = byId.get(item.targetId);
      item.photo = p ? { image_url: p.image_url, first_name: p.first_name } : null;
      item.alreadyDeleted = !p || !!p.deleted_at;
    }
  }
  if (captionIds.length) {
    const { data } = await admin
      .from("captions")
      .select("id, body, deleted_at")
      .in("id", captionIds);
    const byId = new Map((data ?? []).map((c) => [c.id, c]));
    for (const item of items) {
      if (item.targetType !== "caption") continue;
      const c = byId.get(item.targetId);
      item.caption = c ? { body: c.body } : null;
      item.alreadyDeleted = !c || !!c.deleted_at;
    }
  }

  return items;
}
