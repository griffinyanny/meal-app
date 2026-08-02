import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TRPCProvider } from "@/components/shell/trpc-provider";
import { ServiceWorkerRegistrar } from "@/components/shell/service-worker";
import { APPLE_SPLASH_LINKS } from "./apple-splash";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Meal App",
  description: "Your personal chef. AI-powered meal planning.",
  manifest: "/manifest.webmanifest",
  // ⚠️ iOS does NOT read the manifest's `icons` array for the home screen — it
  // reads this link tag. A PWA with a perfect manifest and no apple-touch-icon
  // installs with a screenshot of the page as its icon.
  // `other` carries the iOS launch screen — one tag per device size, generated
  // from the same table as the PNGs. See `./apple-splash`.
  icons: { apple: "/icons/apple-touch-icon.png", other: APPLE_SPLASH_LINKS },
  appleWebApp: {
    capable: true,
    // The label under the icon. iOS truncates around 12 characters.
    title: "Meal App",
    // ⚠️ `black`, not `black-translucent`, and this is a measurement not a
    // taste call: translucent extends the web view UNDER the status bar, which
    // needs `env(safe-area-inset-top)` at the top of every screen — and there
    // is not one `safe-area-inset-top` anywhere in `src/` (every inset in the
    // app is `-bottom`, for the tab bar). Shipping translucent today would put
    // every screen title under the clock on a notched phone. `black` is opaque
    // white-on-black, which is correct for a dark app and needs no layout work.
    // Going translucent is a real improvement and belongs with C's full-screen
    // design artifact, not smuggled in beside a meta tag.
    statusBarStyle: "black",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0F0B08",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col">
        <ServiceWorkerRegistrar />
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}
