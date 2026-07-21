"use client";

import { useEffect, useRef } from "react";

const CAP_SECONDS = 120;

/**
 * Tracks how long the currently-shown photo is actually visible on screen and
 * flushes that dwell time to the server. Only accumulates while the tab is
 * visible (Page Visibility API), caps at 120s, and flushes when the photo
 * changes, the tab hides, or the component unmounts. The server keeps only the
 * viewer's single best session, so re-viewing never inflates a score.
 *
 * Flushes go to /api/view with fetch keepalive (and sendBeacon on pagehide) so
 * the request survives page navigation/unload instead of being cancelled.
 *
 * @param photoId the photo currently on screen (undefined = nothing to track)
 * @param enabled only track for the active week (archived views don't count)
 */
export function useViewTracker(photoId: string | undefined, enabled: boolean) {
  const accumulatedRef = useRef(0);
  const lastStartRef = useRef<number | null>(null);
  const photoRef = useRef<string | undefined>(photoId);

  useEffect(() => {
    if (!enabled) return;

    const send = (id: string, seconds: number, beacon: boolean) => {
      const payload = JSON.stringify({ photoId: id, seconds });
      if (beacon && typeof navigator.sendBeacon === "function") {
        navigator.sendBeacon("/api/view", new Blob([payload], { type: "application/json" }));
      } else {
        void fetch("/api/view", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        });
      }
    };

    const flush = (id: string | undefined, beacon = false) => {
      if (lastStartRef.current !== null) {
        accumulatedRef.current += (Date.now() - lastStartRef.current) / 1000;
        lastStartRef.current = null;
      }
      const secs = Math.min(accumulatedRef.current, CAP_SECONDS);
      if (id && secs > 0.5) send(id, secs, beacon);
      accumulatedRef.current = 0;
    };

    const startClock = () => {
      if (lastStartRef.current === null && document.visibilityState === "visible") {
        lastStartRef.current = Date.now();
      }
    };

    // New photo: flush the previous one, reset, start timing the new one.
    if (photoRef.current !== photoId) {
      flush(photoRef.current);
      photoRef.current = photoId;
    }
    startClock();

    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush(photoRef.current, true);
      else startClock();
    };
    const onPageHide = () => flush(photoRef.current, true);

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      flush(photoRef.current);
    };
  }, [photoId, enabled]);
}
