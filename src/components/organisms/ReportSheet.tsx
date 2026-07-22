"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/atoms/Button";
import { reportContent } from "@/app/report/actions";

type ReportSheetProps = {
  targetType: "photo" | "caption";
  targetId: string;
  isSignedIn: boolean;
  onClose: () => void;
  onDone: () => void;
};

const MAX_REASON = 300;

/**
 * Private report with a written reason. Reports are never shown publicly and
 * can't be upvoted — they go straight to the admin dashboard. Deliberately not
 * a social mechanic: a visible, upvotable pile-on against someone's photo is
 * a very different (and much worse) product than quiet moderation.
 */
export function ReportSheet({
  targetType,
  targetId,
  isSignedIn,
  onClose,
  onDone,
}: ReportSheetProps) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function submit() {
    if (!isSignedIn) {
      router.push(`/signin?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await reportContent(targetType, targetId, reason);
      if (res.ok) onDone();
      else setError(res.error);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Report this photo"
        onClick={(e) => e.stopPropagation()}
        className="safe-bottom w-full max-w-md rounded-t-3xl bg-[#1c1c1c] p-6 pb-6"
      >
        <h2 className="font-marker text-2xl text-white">Report this photo</h2>
        <p className="mt-1 text-sm text-muted">
          Only the moderator sees this. What&apos;s wrong with it?
        </p>

        <textarea
          ref={textareaRef}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={MAX_REASON}
          rows={3}
          placeholder="Tell us what's wrong…"
          className="mt-4 w-full resize-none rounded-2xl bg-white/10 p-4 text-base text-white caret-accent placeholder:text-white/25 focus:outline-none"
        />
        <p className="mt-1 text-right text-xs text-muted">
          {reason.length}/{MAX_REASON}
        </p>

        {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}

        <div className="mt-4 flex gap-3">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={submit} disabled={isPending || !reason.trim()} className="flex-1">
            {isPending ? "Sending…" : "Report"}
          </Button>
        </div>
      </div>
    </div>
  );
}
