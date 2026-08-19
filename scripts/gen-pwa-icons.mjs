// Generates POW's PWA/app icons from one vector definition, so they can be
// regenerated if the mark changes. Run: node scripts/gen-pwa-icons.mjs
import sharp from "sharp";
import { writeFileSync } from "node:fs";

// A tilted polaroid with a warm "photo" — recognizable, no font dependency.
// `rounded` gives the black backing rounded corners (for maskable/apple we want
// a full-bleed square instead, since the OS applies its own mask/rounding).
function svg({ rounded }) {
  const R = rounded ? 112 : 0;
  return `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="photo" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FF8A5B"/>
      <stop offset="1" stop-color="#FFC15E"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="${R}" fill="#0A0A0A"/>
  <g transform="rotate(-8 256 256)">
    <rect x="150" y="120" width="212" height="272" rx="10" fill="#FFFFFF"/>
    <rect x="170" y="140" width="172" height="172" rx="4" fill="url(#photo)"/>
  </g>
</svg>`;
}

const rounded = Buffer.from(svg({ rounded: true }));
const square = Buffer.from(svg({ rounded: false }));

async function png(src, size, out) {
  const buf = await sharp(src).resize(size, size).png().toBuffer();
  writeFileSync(out, buf);
  console.log(`  ${out} (${size}px)`);
}

console.log("Generating PWA icons:");
// Manifest icons (public/, referenced by absolute path)
await png(rounded, 192, "public/icon-192.png");
await png(rounded, 512, "public/icon-512.png");
await png(square, 512, "public/icon-maskable-512.png");
// Next file-convention icons (auto-linked as favicon + apple-touch-icon)
await png(rounded, 512, "src/app/icon.png");
await png(square, 180, "src/app/apple-icon.png");
console.log("Done.");
