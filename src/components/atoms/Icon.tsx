import { cn } from "@/lib/cn";

const ICON_SRC = {
  chevron: "/icons/chevron.svg",
  arrow: "/icons/arrow.svg",
  add: "/icons/add.svg",
  comment: "/icons/comment.svg",
  share: "/icons/share.svg",
  flag: "/icons/flag.svg",
  info: "/icons/info.svg",
} as const;

export type IconName = keyof typeof ICON_SRC;

type IconProps = {
  name: IconName;
  size?: number;
  className?: string;
  alt?: string;
  /** chevron/arrow assets point right natively; pass "left" to mirror. */
  direction?: "left" | "right";
};

/**
 * Renders an icon from an SVG asset exported directly from the Figma file
 * (see public/icons/, fill="white" baked in). Never hand-drawn — swap
 * ICON_SRC entries if the design changes, don't inline new SVG paths.
 * Plain <img>, not next/image: these are tiny static icons, and SVG needs
 * extra Next.js config to run through the image optimizer.
 */
export function Icon({ name, size = 24, className, alt = "", direction = "right" }: IconProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={ICON_SRC[name]}
      alt={alt}
      width={size}
      height={size}
      className={cn(
        "inline-block shrink-0",
        (name === "chevron" || name === "arrow") && direction === "left" && "rotate-180",
        className,
      )}
    />
  );
}
