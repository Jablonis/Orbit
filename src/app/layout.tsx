import type { Metadata, Viewport } from "next";
import { DM_Mono, Figtree } from "next/font/google";
import "./globals.css";

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
  themeColor: "#fbf9f7",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${figtree.variable} ${dmMono.variable} h-full bg-background`}>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
