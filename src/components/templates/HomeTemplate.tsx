"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import { HomeNav } from "@/components/organisms/HomeNav";
import { PolaroidPhotoCard } from "@/components/organisms/PolaroidPhotoCard";
import { CalendarController, type CalendarWeek } from "@/components/molecules/CalendarController";
import { ToolContainer } from "@/components/molecules/ToolContainer";
import { ReportButton } from "@/components/molecules/ReportButton";
import { Toast } from "@/components/atoms/Toast";
import { buildBrowseOrder } from "@/lib/browseOrder";
import { deriveTag } from "@/lib/tags";
import { formatCapturedAt } from "@/lib/week";
import { useViewTracker } from "@/lib/useViewTracker";
import type { FeedPhoto } from "@/lib/types";

type HomeTemplateProps = {
  statusLabel: string;
  weeks: CalendarWeek[];
  photos: FeedPhoto[];
  isActiveWeek: boolean;
  weekId: string;
  initialPhotoId?: string;
  isSignedIn: boolean;
};

export function HomeTemplate({
  statusLabel,
  weeks,
  photos,
  isActiveWeek,
  weekId,
  initialPhotoId,
  isSignedIn,
}: HomeTemplateProps) {
  const router = useRouter();
  const [toast, setToast] = useState<string | null>(null);
  const touchStartX = useRef<number | null>(null);

  const ordered = useMemo(
    () => buildBrowseOrder(photos, { isActiveWeek }),
    [photos, isActiveWeek],
  );

  // Open on the deep-linked photo if one was requested, else the top photo.
  const [index, setIndex] = useState(() => {
    if (!initialPhotoId) return 0;
    const i = ordered.findIndex((p) => p.id === initialPhotoId);
    return i > 0 ? i : 0;
  });

  const current = ordered[index];

  // Track how long the current photo is on screen (active week only).
  useViewTracker(current?.id, isActiveWeek);

  const go = useCallback(
    (delta: number) => {
      setIndex((i) => Math.min(Math.max(i + delta, 0), ordered.length - 1));
    },
    [ordered.length],
  );

  const onShare = useCallback(async () => {
    if (!current) return;
    const url = `${window.location.origin}/week/${weekId}/photo/${current.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setToast("Link copied to clipboard");
    } catch {
      setToast("Could not copy link");
    }
  }, [current, weekId]);

  const onSelectWeek = useCallback(
    (id: string) => {
      if (id === weekId) return;
      router.push(`/week/${id}`);
    },
    [router, weekId],
  );

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
    touchStartX.current = null;
  }

  return (
    <div className="flex min-h-full w-full flex-col">
      <HomeNav statusLabel={statusLabel} />
      <CalendarController weeks={weeks} onSelect={onSelectWeek} />

      <div
        className="flex flex-1 flex-col justify-center"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {current ? (
          <PolaroidPhotoCard
            imageUrl={current.image_url}
            rank={current.rank}
            tag={deriveTag(current, isActiveWeek)}
            topCaption={current.top_caption ?? undefined}
            authorName={authorLabel(current)}
            capturedAtLabel={formatCapturedAt(current.captured_at)}
          />
        ) : (
          <EmptyState isActiveWeek={isActiveWeek} />
        )}
      </div>

      {current ? (
        <ToolContainer
          onPrev={() => go(-1)}
          onNext={() => go(1)}
          prevDisabled={index === 0}
          nextDisabled={index >= ordered.length - 1}
          captionsHref={`/week/${weekId}/photo/${current.id}/captions`}
          submitHref="/submit"
          onShare={onShare}
          reportSlot={
            <ReportButton
              targetType="photo"
              targetId={current.id}
              isSignedIn={isSignedIn}
            />
          }
        />
      ) : null}

      {toast ? <Toast message={toast} onDone={() => setToast(null)} /> : null}
    </div>
  );
}

function authorLabel(photo: FeedPhoto): string {
  return photo.initial ? `${photo.first_name} ${photo.initial}` : photo.first_name;
}

function EmptyState({ isActiveWeek }: { isActiveWeek: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2 px-8 py-24 text-center">
      <p className="font-marker text-2xl text-white">Nothing here yet</p>
      <p className="text-sm text-muted">
        {isActiveWeek
          ? "Be the first to post this week — tap the + to take a photo."
          : "No photos were submitted this week."}
      </p>
    </div>
  );
}
