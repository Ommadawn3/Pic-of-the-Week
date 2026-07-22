"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { ReportSheet } from "@/components/organisms/ReportSheet";

type ReportButtonProps = {
  targetType: "photo" | "caption";
  targetId: string;
  isSignedIn: boolean;
  className?: string;
};

/**
 * Inline report affordance (used on caption rows). Opens the same sheet as the
 * feed's flag button so every report carries a written reason.
 */
export function ReportButton({ targetType, targetId, isSignedIn, className }: ReportButtonProps) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);

  // Both states share a fixed width so swapping the label can't nudge the
  // controls sitting next to it.
  const shared = "inline-block w-[4.5rem] text-center text-xs text-muted";

  if (done) {
    return (
      <span className={cn(shared, className)} role="status">
        Reported
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(shared, "underline-offset-2 hover:underline", className)}
      >
        Report
      </button>
      {open ? (
        <ReportSheet
          targetType={targetType}
          targetId={targetId}
          isSignedIn={isSignedIn}
          onClose={() => setOpen(false)}
          onDone={() => {
            setOpen(false);
            setDone(true);
          }}
        />
      ) : null}
    </>
  );
}
