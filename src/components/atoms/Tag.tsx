import { cn } from "@/lib/cn";
import type { TagVariant } from "@/lib/types";

const LABEL: Record<TagVariant, string> = {
  trending: "Trending",
  new: "New",
};

export function Tag({ variant, className }: { variant: TagVariant; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-8 items-center bg-tag px-2 text-sm font-medium text-white",
        className,
      )}
    >
      {LABEL[variant]}
    </span>
  );
}
