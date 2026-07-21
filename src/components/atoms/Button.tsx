import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "h-12 rounded-full px-6 text-base font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        variant === "primary" && "bg-accent text-white hover:bg-accent/90",
        variant === "secondary" &&
          "bg-chip text-white hover:bg-white/10",
        variant === "ghost" && "text-muted hover:text-white",
        className,
      )}
      {...props}
    />
  );
}
