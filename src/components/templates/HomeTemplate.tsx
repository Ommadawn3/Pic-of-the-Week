"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HomeNav } from "@/components/organisms/HomeNav";
import { FeedScroller } from "@/components/organisms/FeedScroller";
import { PolaroidSkeleton } from "@/components/organisms/FeedSkeleton";
import { CalendarController, type CalendarWeek } from "@/components/molecules/CalendarController";
import { BottomNav } from "@/components/organisms/BottomNav";
import { ScrollTopButton } from "@/components/organisms/ScrollTopButton";
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
  currentUserId?: string | null;
  friendIds?: string[];
  initialFeed?: "global" | "friends";
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
  currentUserId = null,
  friendIds = [],
  initialFeed = "global",
}: HomeTemplateProps) {
  const [toast, setToast] = useState<string | null>(null);
  const [feedMode, setFeedMode] = useState<"global" | "friends">(initialFeed);

  // In Friends mode, show only photos from people you've added (plus your own).
  const friendSet = useMemo(
    () => new Set([...friendIds, currentUserId].filter(Boolean) as string[]),
    [friendIds, currentUserId],
  );

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

  const visiblePhotos = useMemo(
    () =>
      feedMode === "friends"
        ? view.photos.filter((p) => friendSet.has(p.owner_user_id))
        : view.photos,
    [view.photos, feedMode, friendSet],
  );

  const slots = useMemo(
    () => buildBrowseOrder(visiblePhotos, { isActiveWeek: view.isActiveWeek }),
    [visiblePhotos, view.isActiveWeek],
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

  return (
    // min-h-0 is load-bearing on both this column and the scroller inside it:
    // without it the flex child refuses to shrink and grows the page instead
    // of scrolling. relative anchors the floating scroll-to-top button.
    <div className="relative flex h-full min-h-0 w-full flex-col">
      <HomeNav statusLabel={view.statusLabel} accountHref={isSignedIn ? "/account" : undefined} />
      <CalendarController weeks={navWeeks} onSelect={onSelectWeek} />

      {isSignedIn ? (
        <div className="flex shrink-0 justify-center gap-2 px-6 pb-1 pt-1">
          {(["global", "friends"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setFeedMode(m)}
              className={
                "rounded-full px-4 py-1 text-sm font-medium capitalize " +
                (feedMode === m ? "bg-white text-black" : "bg-white/10 text-white")
              }
            >
              {m}
            </button>
          ))}
        </div>
      ) : null}

      {loadingWeek ? (
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <PolaroidSkeleton />
        </div>
      ) : slots.length > 0 ? (
        // Keyed on week + feed mode so a switch remounts the scroller with a
        // fresh scroll position rather than stranding it mid-feed.
        <FeedScroller
          key={`${view.weekId}-${feedMode}`}
          slots={slots}
          initialIndex={initialIndex}
          onActiveChange={onActiveChange}
          currentUserId={currentUserId}
        />
      ) : feedMode === "friends" ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-8 text-center">
          <p className="font-marker text-2xl text-white">No friends here yet</p>
          <p className="text-sm text-muted">
            Add friends from their photo, or share your invite link.
          </p>
          <a href="/account" className="text-sm text-accent">
            Get your invite link
          </a>
        </div>
      ) : (
        <EmptyState isActiveWeek={view.isActiveWeek} />
      )}

      {slots.length > 0 ? <ScrollTopButton /> : null}

      <BottomNav />

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
