import { cn } from "@/lib/cn";

export function StatusPill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-chip px-3 py-1.5 text-base font-medium text-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}
