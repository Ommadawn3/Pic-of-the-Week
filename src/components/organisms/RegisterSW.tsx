"use client";

import { useEffect } from "react";

/**
 * Registers the service worker so the app is installable. Production only —
 * a SW in dev caches build assets and makes hot-reload behave strangely.
 */
export function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* registration is best-effort; the app works without it */
    });
  }, []);
  return null;
}
