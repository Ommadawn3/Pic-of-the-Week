"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/components/atoms/Icon";

export function StandardNav({ title, onBack }: { title: string; onBack?: () => void }) {
  const router = useRouter();
  return (
    <div className="flex h-[49px] items-center justify-between border-b border-hairline px-6">
      <button
        type="button"
        aria-label="Back"
        onClick={onBack ?? (() => router.back())}
        className="flex size-8 items-center justify-center"
      >
        <Icon name="arrow" direction="left" size={20} />
      </button>
      <p className="text-base font-bold text-white">{title}</p>
      <span className="size-8" aria-hidden />
    </div>
  );
}
