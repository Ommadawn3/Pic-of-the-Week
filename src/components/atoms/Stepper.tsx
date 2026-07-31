"use client";

import { cn } from "@/lib/cn";

type StepperProps = {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  className?: string;
  "aria-label"?: string;
};

/** Number stepper: − [n] +. Optional field, so min defaults to 0. */
export function Stepper({
  value,
  onChange,
  min = 0,
  max = 50,
  className,
  "aria-label": ariaLabel,
}: StepperProps) {
  const set = (n: number) => onChange(Math.max(min, Math.min(max, n)));

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "flex h-12 items-center justify-between rounded-full bg-white/10 px-2",
        className,
      )}
    >
      <StepButton label="Decrease" disabled={value <= min} onClick={() => set(value - 1)}>
        −
      </StepButton>
      <span
        aria-live="polite"
        className="min-w-8 text-center text-lg font-semibold text-white tabular-nums"
      >
        {value}
      </span>
      <StepButton label="Increase" disabled={value >= max} onClick={() => set(value + 1)}>
        +
      </StepButton>
    </div>
  );
}

function StepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-9 items-center justify-center rounded-full text-2xl leading-none text-white transition-colors active:bg-white/10 disabled:opacity-30"
    >
      {children}
    </button>
  );
}
