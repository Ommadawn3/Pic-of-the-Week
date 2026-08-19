import Link from "next/link";
import { StatusPill } from "@/components/atoms/StatusPill";

type HomeNavProps = {
  statusLabel: string;
  /** When set, shows a profile button linking to the account page. */
  accountHref?: string;
};

export function HomeNav({ statusLabel, accountHref }: HomeNavProps) {
  return (
    // mt-2 adds 8px above the banner (on top of the notch inset) to give the
    // phone's own UI a little breathing room.
    <div className="safe-top mt-2 flex w-full shrink-0 items-center justify-between px-6 py-3.5">
      <div className="flex items-end gap-1.5 font-marker text-white">
        <span className="text-3xl">Pic</span>
        <span className="flex flex-col pt-1 text-[15px] leading-[0.9]">
          <span>of</span>
          <span>the</span>
        </span>
        <span className="text-3xl">Week</span>
      </div>
      <div className="flex items-center gap-2">
        <StatusPill>{statusLabel}</StatusPill>
        {accountHref ? (
          <Link
            href={accountHref}
            aria-label="Account"
            className="flex size-9 items-center justify-center rounded-full border border-hairline text-white active:bg-white/10"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
              <path
                d="M4.5 19.5c0-3.6 3.4-5.5 7.5-5.5s7.5 1.9 7.5 5.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </Link>
        ) : null}
      </div>
    </div>
  );
}
