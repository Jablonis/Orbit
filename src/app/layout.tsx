import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { THEME_COOKIE, parseTheme, themeAttribute } from "@/lib/theme";
import { DM_Mono, Figtree } from "next/font/google";
import "./globals.css";
import { PullToRefresh } from "@/components/PullToRefresh";

// Figtree carries the product: humanist rather than geometric, so it reads
// like a person wrote it and not like a terminal printed it.
const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
});

// DM Mono only for labels and codes — warmer than the technical monos, and it
// stops at 500, which is the weight the labels use anyway.
const dmMono = DM_Mono({
  subsets: ["latin"],
  variable: "--font-dm-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: {
    default: "Orbit",
    template: "%s · Orbit",
  },
  description: "Personal operating system dashboard.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Orbit",
  },
  icons: {
    apple: "/apple-touch-icon.png",
    icon: [
      { sizes: "192x192", type: "image/png", url: "/icon-192.png" },
      { sizes: "512x512", type: "image/png", url: "/icon-512.png" },
    ],
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  // The bar above the app on a phone is painted by the browser, so it has to
  // be told which canvas it is sitting on.
  themeColor: [
    { color: "#fbf9f7", media: "(prefers-color-scheme: light)" },
    { color: "#131118", media: "(prefers-color-scheme: dark)" },
  ],
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Stamped here, before the document is sent, so the first paint is already
  // the right colour. No stamp means "follow the system".
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);

  return (
    <html
      className={`${figtree.variable} ${dmMono.variable} h-full bg-background`}
      data-theme={themeAttribute(theme)}
      lang="en"
    >
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <PullToRefresh />
        {children}
      </body>
    </html>
  );
}
