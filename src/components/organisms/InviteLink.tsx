"use client";

import { useState } from "react";
import { Button } from "@/components/atoms/Button";

/** Shows the user's "add me" invite link with a share/copy affordance. */
export function InviteLink({ userId }: { userId: string }) {
  const [copied, setCopied] = useState(false);

  async function onShare() {
    const link = `${window.location.origin}/add/${userId}`;
    if (navigator.share) {
      try {
        await navigator.share({ url: link, title: "Add me on Pic of the Week" });
      } catch {
        /* cancelled */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Button variant="secondary" onClick={onShare} className="self-start">
        Share invite link
      </Button>
      {copied ? <span className="text-sm text-muted">Copied</span> : null}
    </div>
  );
}
