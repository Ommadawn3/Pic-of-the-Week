"use client";

import { cn } from "@/lib/cn";
import { useId, type InputHTMLAttributes } from "react";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  showCount?: boolean;
};

export function TextField({
  label,
  showCount,
  maxLength,
  value,
  className,
  id,
  ...props
}: TextFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const length = typeof value === "string" ? value.length : 0;

  return (
    <label
      htmlFor={fieldId}
      className={cn(
        "flex h-12 items-center gap-3 rounded-full bg-white/10 pl-6 pr-4",
        className,
      )}
    >
      <span className="sr-only">{label}</span>
      <input
        id={fieldId}
        placeholder={label}
        maxLength={maxLength}
        value={value}
        // text-base (16px) is deliberate: iOS Safari auto-zooms into any input
        // smaller than 16px on focus, which fights the fixed-shell layout.
        className="min-w-0 flex-1 bg-transparent text-base font-medium text-white caret-accent placeholder:text-white/25 focus:outline-none"
        {...props}
      />
      {showCount && maxLength ? (
        <span className="shrink-0 text-xs text-muted">
          {length}/{maxLength}
        </span>
      ) : null}
    </label>
  );
}
