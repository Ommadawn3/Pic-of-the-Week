import { cn } from "@/lib/cn";

export type TagVariant = "leading" | "trending" | "new";

const LABEL: Record<TagVariant, string> = {
  leading: "Leading this week",
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
