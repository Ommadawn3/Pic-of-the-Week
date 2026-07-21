"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { reportContent } from "@/app/report/actions";

type ReportButtonProps = {
  targetType: "photo" | "caption";
  targetId: string;
  isSignedIn: boolean;
  className?: string;
};

export function ReportButton({ targetType, targetId, isSignedIn, className }: ReportButtonProps) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "done">("idle");
  const [isPending, startTransition] = useTransition();

  function onReport() {
    if (!isSignedIn) {
      router.push(`/signin?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    startTransition(async () => {
      await reportContent(targetType, targetId);
      setState("done");
    });
  }

  // Both states share a fixed width so swapping the label can't nudge the
  // controls sitting next to it.
  const shared = "inline-block w-[4.5rem] text-center text-xs text-muted";

  if (state === "done") {
    return (
      <span className={cn(shared, className)} role="status">
        Reported
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onReport}
      disabled={isPending}
      className={cn(shared, "underline-offset-2 hover:underline disabled:opacity-50", className)}
    >
      Report
    </button>
  );
}
