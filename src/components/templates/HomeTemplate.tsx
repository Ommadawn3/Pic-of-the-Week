"use client";

import { useCallback, useMemo, useState } from "react";
import { HomeNav } from "@/components/organisms/HomeNav";
import { FeedScroller } from "@/components/organisms/FeedScroller";
import { CalendarController, type CalendarWeek } from "@/components/molecules/CalendarController";
import { ToolContainer } from "@/components/molecules/ToolContainer";
import { ReportSheet } from "@/components/organisms/ReportSheet";
import { InfoOverlay } from "@/components/organisms/InfoOverlay";
import { Toast } from "@/components/atoms/Toast";
import { buildBrowseOrder } from "@/lib/browseOrder";
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
  const [toast, setToast] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  const slots = useMemo(
    () => buildBrowseOrder(photos, { isActiveWeek }),
    [photos, isActiveWeek],
  );

  const initialIndex = useMemo(() => {
    if (!initialPhotoId) return 0;
    return Math.max(
      slots.findIndex((s) => s.photo.id === initialPhotoId),
      0,
    );
  }, [slots, initialPhotoId]);

  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const current = slots[activeIndex]?.photo;

  useViewTracker(current?.id, isActiveWeek);

  // Keep the URL pointed at the visible card so Back (e.g. from captions),
  // refresh, and share all land on the right photo. replaceState is a shallow
  // update — it doesn't re-run the route.
  const onActiveChange = useCallback(
    (i: number) => {
      setActiveIndex(i);
      const slot = slots[i];
      if (slot) {
        window.history.replaceState(null, "", `/week/${weekId}/photo/${slot.photo.id}`);
      }
    },
    [slots, weekId],
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

  // Week navigation is handled by the CalendarController's Links (so Next can
  // prefetch each week's shell) — nothing to push from here.

  return (
    // min-h-0 is load-bearing on both this column and the scroller inside it:
    // without it the flex child refuses to shrink and grows the page instead
    // of scrolling.
    <div className="flex h-full min-h-0 w-full flex-col">
      <HomeNav statusLabel={statusLabel} />
      <CalendarController weeks={weeks} />

      {slots.length > 0 ? (
        <FeedScroller
          slots={slots}
          initialIndex={initialIndex}
          onActiveChange={onActiveChange}
        />
      ) : (
        <EmptyState isActiveWeek={isActiveWeek} />
      )}

      {/* Rendered even on an empty week so the submit button stays reachable. */}
      <ToolContainer
        captionsHref={
          current ? `/week/${weekId}/photo/${current.id}/captions` : undefined
        }
        captionCount={current?.caption_count ?? 0}
        submitHref="/submit"
        onShare={current ? onShare : undefined}
        onReport={current ? () => setReportOpen(true) : undefined}
        onInfo={current ? () => setInfoOpen(true) : undefined}
      />

      {reportOpen && current ? (
        <ReportSheet
          targetType="photo"
          targetId={current.id}
          isSignedIn={isSignedIn}
          onClose={() => setReportOpen(false)}
          onDone={() => {
            setReportOpen(false);
            setToast("Reported — thanks");
          }}
        />
      ) : null}

      {infoOpen && current ? (
        <InfoOverlay photo={current} onClose={() => setInfoOpen(false)} />
      ) : null}

      {toast ? <Toast message={toast} onDone={() => setToast(null)} /> : null}
    </div>
  );
}

function EmptyState({ isActiveWeek }: { isActiveWeek: boolean }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-8 text-center">
      <p className="font-marker text-2xl text-white">Nothing here yet</p>
      <p className="text-sm text-muted">
        {isActiveWeek
          ? "Be the first to post this week — tap the + to take a photo."
          : "No photos were submitted this week."}
      </p>
    </div>
  );
}
