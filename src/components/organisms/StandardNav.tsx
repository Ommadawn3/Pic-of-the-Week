"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/components/atoms/Icon";

export function StandardNav({ title, onBack }: { title: string; onBack?: () => void }) {
  const router = useRouter();
  return (
    <div className="safe-top flex shrink-0 items-center justify-between border-b border-hairline px-4 py-1">
      {/* size-11 (44px) is the iOS minimum tap target; -ml-2 keeps the icon
          optically aligned with the 24px page gutter despite the bigger box. */}
      <button
        type="button"
        aria-label="Back"
        onClick={onBack ?? (() => router.back())}
        className="-ml-2 flex size-11 items-center justify-center rounded-full active:bg-white/10"
      >
        <Icon name="arrow" direction="left" size={20} />
      </button>
      <p className="text-base font-bold text-white">{title}</p>
      <span className="-mr-2 size-11" aria-hidden />
    </div>
  );
}
