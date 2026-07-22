import type { Metadata, Viewport } from "next";
import { Inter, Permanent_Marker } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const permanentMarker = Permanent_Marker({
  variable: "--font-marker",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pic of the Week",
  description:
    "One candid photo a week, ranked by how long people actually look.",
};

// The app behaves like a native feed: the shell is fixed and only the feed
// scrolls, so page-level scrolling and pinch-zoom are disabled. themeColor
// black keeps the browser chrome blended with the page instead of flashing
// white. viewportFit cover means HomeNav/ToolContainer must carry
// env(safe-area-inset-*) padding — see .safe-top / .safe-bottom in globals.css.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${permanentMarker.variable} antialiased`}
    >
      <body className="bg-app text-app font-sans">{children}</body>
    </html>
  );
}
