"use client";

import { useState, useSyncExternalStore } from "react";
import { useInstallPrompt } from "@/lib/useInstallPrompt";

const DISMISS_KEY = "pow-install-dismissed";

// false during SSR/hydration, true once mounted on the client — lets us read
// localStorage at render time without a setState-in-effect.
const noopSubscribe = () => () => {};
function useHasMounted() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/**
 * PLACEHOLDER install toast — functional, deliberately plain. The visual design
 * is being reworked; keep the behavior (the hook, the dismiss key, the
 * Android-vs-iOS split) and restyle the markup.
 *
 *  • Android/Chrome: an "Install" button that fires the real native prompt.
 *  • iOS Safari: instructions, since Apple blocks programmatic installs.
 *  • Hidden once installed (standalone) or dismissed.
 */
export function InstallPrompt() {
  const { platform, isStandalone, canInstall, promptInstall } = useInstallPrompt();
  const hasMounted = useHasMounted();
  const [dismissedNow, setDismissedNow] = useState(false);

  const dismissed =
    dismissedNow || (hasMounted && localStorage.getItem(DISMISS_KEY) === "1");

  if (!hasMounted || isStandalone || dismissed) return null;

  const showAndroid = platform === "android" && canInstall;
  const showIOS = platform === "ios";
  if (!showAndroid && !showIOS) return null;

  const close = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissedNow(true);
  };

  return (
    <div className="safe-top pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-3">
      <div className="pointer-events-auto mt-2 flex w-full max-w-md items-center gap-3 rounded-2xl border border-hairline bg-chip/95 px-4 py-3 backdrop-blur">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon-192.png" alt="" className="size-9 rounded-lg" />
        <div className="flex-1 text-sm text-white">
          {showAndroid ? (
            "Add POW to your home screen"
          ) : (
            <>
              Install POW: tap <span aria-hidden>⎋</span> Share, then{" "}
              <span className="whitespace-nowrap">“Add to Home Screen”</span>
            </>
          )}
        </div>
        {showAndroid ? (
          <button
            type="button"
            onClick={() => void promptInstall()}
            className="rounded-full bg-accent-bg px-4 py-1.5 text-sm font-medium text-white"
          >
            Install
          </button>
        ) : null}
        <button
          type="button"
          onClick={close}
          aria-label="Dismiss"
          className="px-1 text-lg leading-none text-muted"
        >
          ×
        </button>
      </div>
    </div>
  );
}
