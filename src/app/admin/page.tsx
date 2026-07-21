import Image from "next/image";
import { isAdmin } from "@/lib/admin";
import { getOpenReports } from "@/lib/data/admin";
import { AdminLoginForm } from "@/components/organisms/AdminLoginForm";
import {
  adminLogout,
  deleteTarget,
  resolveReportsForTarget,
} from "@/app/admin/actions";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await isAdmin())) {
    return (
      <main className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
        <AdminLoginForm />
      </main>
    );
  }

  const reports = await getOpenReports();

  return (
    <main className="mx-auto flex min-h-full w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <header className="flex items-center justify-between">
        <h1 className="font-marker text-2xl">Moderation</h1>
        <form action={adminLogout}>
          <button type="submit" className="text-sm text-muted hover:text-white">
            Sign out
          </button>
        </form>
      </header>

      {reports.length === 0 ? (
        <p className="text-muted">No open reports. All clear.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {reports.map((item) => (
            <li
              key={`${item.targetType}:${item.targetId}`}
              className="flex flex-col gap-3 rounded-2xl border border-hairline bg-chip p-4"
            >
              <div className="flex items-start gap-3">
                {item.targetType === "photo" && item.photo ? (
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-black">
                    <Image
                      src={item.photo.image_url}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="64px"
                      unoptimized
                    />
                  </div>
                ) : null}
                <div className="flex flex-1 flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs uppercase text-muted">
                      {item.targetType}
                    </span>
                    <span className="text-xs text-muted">
                      {item.reportCount} report{item.reportCount > 1 ? "s" : ""}
                    </span>
                    {item.alreadyDeleted ? (
                      <span className="text-xs text-danger">already removed</span>
                    ) : null}
                  </div>
                  <p className="text-sm text-white">
                    {item.targetType === "caption"
                      ? item.caption?.body ?? "(deleted caption)"
                      : `Photo by ${item.photo?.first_name ?? "unknown"}`}
                  </p>
                  {item.reasons.length ? (
                    <p className="text-xs text-muted">Reasons: {item.reasons.join("; ")}</p>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <DismissForm targetType={item.targetType} targetId={item.targetId} />
                {!item.alreadyDeleted ? (
                  <DeleteForm targetType={item.targetType} targetId={item.targetId} />
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function DismissForm({ targetType, targetId }: { targetType: "photo" | "caption"; targetId: string }) {
  return (
    <form action={dismissByTarget}>
      <input type="hidden" name="targetType" value={targetType} />
      <input type="hidden" name="targetId" value={targetId} />
      <button
        type="submit"
        className="rounded-full bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
      >
        Dismiss
      </button>
    </form>
  );
}

function DeleteForm({ targetType, targetId }: { targetType: "photo" | "caption"; targetId: string }) {
  return (
    <form action={removeByTarget}>
      <input type="hidden" name="targetType" value={targetType} />
      <input type="hidden" name="targetId" value={targetId} />
      <button
        type="submit"
        className="rounded-full bg-danger/20 px-4 py-2 text-sm text-danger hover:bg-danger/30"
      >
        Remove content
      </button>
    </form>
  );
}

async function dismissByTarget(formData: FormData) {
  "use server";
  await resolveReportsForTarget(
    formData.get("targetType") as "photo" | "caption",
    String(formData.get("targetId")),
  );
}

async function removeByTarget(formData: FormData) {
  "use server";
  await deleteTarget(
    formData.get("targetType") as "photo" | "caption",
    String(formData.get("targetId")),
  );
}
