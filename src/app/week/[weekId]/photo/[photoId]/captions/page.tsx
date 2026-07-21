import { notFound } from "next/navigation";
import { CaptionFlowTemplate } from "@/components/templates/CaptionFlowTemplate";
import { getPhotoCaptions, getPhotoHeader } from "@/lib/data/captions";
import { getWeekById } from "@/lib/data/feed";
import { getUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function CaptionsPage({
  params,
}: {
  params: Promise<{ weekId: string; photoId: string }>;
}) {
  const { weekId, photoId } = await params;
  const [photo, captions, user, week] = await Promise.all([
    getPhotoHeader(photoId),
    getPhotoCaptions(photoId),
    getUser(),
    getWeekById(weekId),
  ]);
  if (!photo) notFound();

  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col">
      <CaptionFlowTemplate
        photo={photo}
        weekId={weekId}
        initialCaptions={captions}
        isSignedIn={!!user}
        isActiveWeek={week?.status === "active"}
      />
    </main>
  );
}
