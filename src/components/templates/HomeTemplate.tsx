"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HomeNav } from "@/components/organisms/HomeNav";
import { FeedScroller } from "@/components/organisms/FeedScroller";
import { PolaroidSkeleton } from "@/components/organisms/FeedSkeleton";
import { CalendarController, type CalendarWeek } from "@/components/molecules/CalendarController";
import { ToolContainer } from "@/components/molecules/ToolContainer";
import { ReportSheet } from "@/components/organisms/ReportSheet";
import { InfoOverlay } from "@/components/organisms/InfoOverlay";
import { Toast } from "@/components/atoms/Toast";
import { buildBrowseOrder } from "@/lib/browseOrder";
import { useViewTracker } from "@/lib/useViewTracker";
import { weekStatusLabel } from "@/lib/week";
import type { ContestWeek, FeedPhoto } from "@/lib/types";

type HomeTemplateProps = {
  statusLabel: string;
  weeks: CalendarWeek[];
  photos: FeedPhoto[];
  isActiveWeek: boolean;
  weekId: string;
  initialPhotoId?: string;
  isSignedIn: boolean;
};

type WeekView = {
  weekId: string;
  photos: FeedPhoto[];
  isActiveWeek: boolean;
  statusLabel: string;
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

  // The visible week lives in client state so switching weeks swaps only the
  // photo area — the header, week navigator and tool bar stay mounted instead
  // of the whole shell tearing down and flashing a skeleton.
  const [view, setView] = useState<WeekView>({
    weekId,
    photos,
    isActiveWeek,
    statusLabel,
  });
  const [loadingWeek, setLoadingWeek] = useState(false);
  const requestRef = useRef(0);

  const slots = useMemo(
    () => buildBrowseOrder(view.photos, { isActiveWeek: view.isActiveWeek }),
    [view.photos, view.isActiveWeek],
  );

  // Deep-linked photo only applies to the week we arrived on.
  const initialIndex = useMemo(() => {
    if (!initialPhotoId || view.weekId !== weekId) return 0;
    return Math.max(
      slots.findIndex((s) => s.photo.id === initialPhotoId),
      0,
    );
  }, [slots, initialPhotoId, view.weekId, weekId]);

  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const current = slots[activeIndex]?.photo;

  useViewTracker(current?.id, view.isActiveWeek);

  const loadWeek = useCallback(
    async (id: string, { push }: { push: boolean }) => {
      const token = ++requestRef.current;
      setLoadingWeek(true);
      try {
        const res = await fetch(`/api/week/${id}/feed`);
        if (!res.ok) throw new Error("failed");
        const data: { week: ContestWeek; photos: FeedPhoto[] } = await res.json();
        // A slower earlier request must not overwrite a newer one.
        if (token !== requestRef.current) return;

        setView({
          weekId: data.week.id,
          photos: data.photos,
          isActiveWeek: data.week.status === "active",
          statusLabel: weekStatusLabel(data.week),
        });
        setActiveIndex(0);
        if (push) window.history.pushState(null, "", `/week/${data.week.id}`);
      } catch {
        if (token === requestRef.current) setToast("Couldn't load that week");
      } finally {
        if (token === requestRef.current) setLoadingWeek(false);
      }
    },
    [],
  );

  const onSelectWeek = useCallback(
    (id: string) => {
      if (id === view.weekId || loadingWeek) return;
      void loadWeek(id, { push: true });
    },
    [view.weekId, loadingWeek, loadWeek],
  );

  // Back/forward between weeks stays client-side too. Photo changes use
  // replaceState so they don't add history entries — only week switches do.
  useEffect(() => {
    const onPop = () => {
      const match = window.location.pathname.match(/^\/week\/([^/]+)/);
      const target = match?.[1] ?? weekId;
      if (target !== view.weekId) void loadWeek(target, { push: false });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [view.weekId, weekId, loadWeek]);

  const navWeeks = useMemo(
    () => weeks.map((w) => ({ ...w, isActive: w.id === view.weekId })),
    [weeks, view.weekId],
  );

  const onActiveChange = useCallback(
    (i: number) => {
      setActiveIndex(i);
      const slot = slots[i];
      if (slot) {
        window.history.replaceState(null, "", `/week/${view.weekId}/photo/${slot.photo.id}`);
      }
    },
    [slots, view.weekId],
  );

  const onShare = useCallback(async () => {
    if (!current) return;
    const url = `${window.location.origin}/week/${view.weekId}/photo/${current.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setToast("Link copied to clipboard");
    } catch {
      setToast("Could not copy link");
    }
  }, [current, view.weekId]);

  return (
    // min-h-0 is load-bearing on both this column and the scroller inside it:
    // without it the flex child refuses to shrink and grows the page instead
    // of scrolling.
    <div className="flex h-full min-h-0 w-full flex-col">
      <HomeNav statusLabel={view.statusLabel} />
      <CalendarController weeks={navWeeks} onSelect={onSelectWeek} />

      {loadingWeek ? (
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <PolaroidSkeleton />
        </div>
      ) : slots.length > 0 ? (
        // Keyed on the week so a switch remounts the scroller with a fresh
        // scroll position rather than stranding it mid-feed.
        <FeedScroller
          key={view.weekId}
          slots={slots}
          initialIndex={initialIndex}
          onActiveChange={onActiveChange}
        />
      ) : (
        <EmptyState isActiveWeek={view.isActiveWeek} />
      )}

      {/* Rendered even on an empty week so the submit button stays reachable. */}
      <ToolContainer
        captionsHref={
          current ? `/week/${view.weekId}/photo/${current.id}/captions` : undefined
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
