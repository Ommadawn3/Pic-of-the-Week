"use client";

import { cn } from "@/lib/cn";
import { Icon } from "@/components/atoms/Icon";

type VoteControlProps = {
  count: number;
  hasVoted: boolean;
  disabled?: boolean;
  pending?: boolean;
  onClick?: () => void;
};

export function VoteControl({ count, hasVoted, disabled, pending, onClick }: VoteControlProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="min-w-4 text-right text-sm tabular-nums text-muted">{count}</span>
      <button
        type="button"
        aria-label={hasVoted ? "Remove vote" : "Upvote caption"}
        aria-pressed={hasVoted}
        disabled={disabled || pending}
        onClick={onClick}
        className={cn(
          "flex size-7 items-center justify-center rounded-full border transition-colors disabled:opacity-40",
          hasVoted
            ? "border-accent-border bg-accent text-white"
            : "border-white/20 bg-white/5 hover:bg-white/10",
        )}
      >
        {/* same arrow as the home tool bar; points right natively, rotate -90° for up */}
        <Icon name="arrow" size={14} className="-rotate-90" />
      </button>
    </div>
  );
}
