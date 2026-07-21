import { StatusPill } from "@/components/atoms/StatusPill";

type HomeNavProps = {
  statusLabel: string;
};

export function HomeNav({ statusLabel }: HomeNavProps) {
  return (
    <div className="flex w-full items-center justify-between px-6 py-3.5">
      <div className="flex items-end gap-1.5 font-marker text-white">
        <span className="text-3xl">Pic</span>
        <span className="flex flex-col pt-1 text-[15px] leading-[0.9]">
          <span>of</span>
          <span>the</span>
        </span>
        <span className="text-3xl">Week</span>
      </div>
      <StatusPill>{statusLabel}</StatusPill>
    </div>
  );
}
