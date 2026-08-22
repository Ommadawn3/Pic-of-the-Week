"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GlyphIcon, type GlyphName } from "@/components/atoms/GlyphIcon";
import { cn } from "@/lib/cn";

type Tab = { href: string; label: string; icon: GlyphName };

const TABS: Tab[] = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/leaderboard", label: "Board", icon: "board" },
  { href: "/account", label: "You", icon: "person" },
  { href: "/help", label: "Help", icon: "help" },
];

/**
 * App-wide bottom navigation. The bottom bar now means navigation and nothing
 * else — per-photo actions moved onto the polaroid — so it can't be mistaken for
 * photo controls. Submit is the emphasized center "+".
 */
export function BottomNav() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <nav
      aria-label="Main"
      className="safe-bottom flex w-full shrink-0 items-center justify-around border-t border-hairline px-4 pt-2"
    >
      <TabLink tab={TABS[0]} active={isActive(TABS[0].href)} />
      <TabLink tab={TABS[1]} active={isActive(TABS[1].href)} />

      <Link
        href="/submit"
        aria-label="Post a photo"
        className="flex size-12 items-center justify-center rounded-full bg-accent text-white active:scale-95"
      >
        <GlyphIcon name="plus" size={26} />
      </Link>

      <TabLink tab={TABS[2]} active={isActive(TABS[2].href)} />
      <TabLink tab={TABS[3]} active={isActive(TABS[3].href)} />
    </nav>
  );
}

function TabLink({ tab, active }: { tab: Tab; active: boolean }) {
  return (
    <Link
      href={tab.href}
      aria-label={tab.label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex w-14 flex-col items-center gap-0.5",
        active ? "text-white" : "text-muted",
      )}
    >
      <GlyphIcon name={tab.icon} size={24} />
      <span className="text-[10px] font-medium">{tab.label}</span>
    </Link>
  );
}
