import { cn } from "@/lib/cn";

/**
 * Inline `currentColor` icons for the redesigned feed nav and per-photo action
 * row. Unlike the Figma-exported white SVGs in Icon.tsx, these inherit color, so
 * they work on both the dark nav bar and the white polaroid. Swap for exact
 * Figma exports when the icon set is finalized.
 */
export type GlyphName =
  | "home"
  | "board"
  | "plus"
  | "person"
  | "help"
  | "eye"
  | "download"
  | "share"
  | "comment"
  | "arrow-up"
  | "refresh";

const PATHS: Record<GlyphName, React.ReactNode> = {
  home: <path d="M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5" />,
  board: (
    <>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  person: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.6 3.1-5.5 7-5.5s7 1.9 7 5.5" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.2 9.3a2.8 2.8 0 0 1 5.4 1c0 1.9-2.6 2.2-2.6 3.9" />
      <circle cx="12" cy="17.4" r="0.6" fill="currentColor" stroke="none" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.6" />
    </>
  ),
  download: <path d="M12 3v11m0 0 4-4m-4 4-4-4M4 20h16" />,
  share: (
    <>
      <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
      <path d="M12 15V3m0 0 4 4m-4-4-4 4" />
    </>
  ),
  comment: <path d="M4 5h16v11H9l-4 3.5V16H4z" />,
  "arrow-up": <path d="M12 20V5m0 0 6 6m-6-6-6 6" />,
  refresh: (
    <>
      <path d="M20 11a8 8 0 0 0-14-4.5L3 9" />
      <path d="M3 4v5h5" />
      <path d="M4 13a8 8 0 0 0 14 4.5L21 15" />
      <path d="M21 20v-5h-5" />
    </>
  ),
};

export function GlyphIcon({
  name,
  size = 24,
  className,
}: {
  name: GlyphName;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      {PATHS[name]}
    </svg>
  );
}
