import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-plex-mono",
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
    <html lang="en" className={`${jakarta.variable} ${plexMono.variable} h-full bg-background`}>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
