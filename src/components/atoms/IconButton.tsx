import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes } from "react";

type Variant = "default" | "accent";

export function iconButtonClass(variant: Variant = "default", className?: string) {
  return cn(
    "flex size-12 items-center justify-center rounded-full transition-all",
    variant === "default" && "bg-chip hover:bg-white/10",
    variant === "accent" &&
      "border border-accent-border bg-accent-bg hover:bg-accent-bg/80",
    // "Recessed": an unavailable arrow sinks into the background instead of
    // just going flat — inset shadow, dimmed glyph, no hover response.
    "disabled:pointer-events-none disabled:bg-black/30 disabled:opacity-45 disabled:shadow-[inset_0_1px_3px_rgba(0,0,0,0.6)]",
    className,
  );
}

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

export function IconButton({ variant = "default", className, children, ...props }: IconButtonProps) {
  return (
    <button type="button" className={iconButtonClass(variant, className)} {...props}>
      {children}
    </button>
  );
}
