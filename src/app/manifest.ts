import type { MetadataRoute } from "next";

// Web App Manifest — makes POW installable to the home screen. Next auto-injects
// the <link rel="manifest"> from this file convention. Black to match the app
// shell so the splash/chrome never flashes white.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pic of the Week",
    short_name: "POW",
    description: "One candid photo a week, ranked by how long people actually look.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#000000",
    theme_color: "#000000",
    categories: ["photo", "social", "entertainment"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
