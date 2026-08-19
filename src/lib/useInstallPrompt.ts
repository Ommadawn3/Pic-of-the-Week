"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

/** The non-standard event Chrome fires when the app is installable. */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type InstallPlatform = "android" | "ios" | "other";

/**
 * Install-prompt plumbing for the home-screen toast.
 *
 * Android/Chrome fires `beforeinstallprompt`, which we capture so a button can
 * trigger the real native install. iOS Safari fires nothing and blocks
 * programmatic installs entirely — there we can only detect the platform and
 * show instructions ("Share → Add to Home Screen").
 */
export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  // Environment facts, read at render (guarded for SSR). They're stable for the
  // session, so this stays out of an effect — which also satisfies the compiler's
  // no-setState-in-effect rule. Safe against hydration mismatch because the toast
  // renders nothing until its own client-only `ready` flag flips.
  const { platform, isStandalone } = useMemo<{
    platform: InstallPlatform;
    isStandalone: boolean;
  }>(() => {
    if (typeof window === "undefined") return { platform: "other", isStandalone: false };
    const ua = window.navigator.userAgent;
    const isIOS =
      /iphone|ipad|ipod/i.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isAndroid = /android/i.test(ua);
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari's non-standard standalone flag.
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    return {
      platform: isIOS ? "ios" : isAndroid ? "android" : "other",
      isStandalone: standalone,
    };
  }, []);

  useEffect(() => {
    const onBIP = (e: Event) => {
      e.preventDefault(); // stop Chrome's default mini-infobar; we drive our own UI
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setDeferred(null);
    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferred) return null;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    return outcome;
  }, [deferred]);

  return { platform, isStandalone, canInstall: deferred !== null, promptInstall };
}
