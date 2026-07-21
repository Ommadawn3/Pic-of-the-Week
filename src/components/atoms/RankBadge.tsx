import { cn } from "@/lib/cn";

export function RankBadge({ rank, className }: { rank: number; className?: string }) {
  return (
    <span
      className={cn(
        "flex size-8 items-center justify-center bg-rank text-base font-medium text-white",
        className,
      )}
    >
      {rank}
    </span>
  );
}
