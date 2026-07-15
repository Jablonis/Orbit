import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Orbit",
  description: "Personal operating system dashboard.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sk" className={`${geistSans.variable} ${geistMono.variable} h-full bg-[#0d0d0e]`}>
      <body className="min-h-screen bg-[#0d0d0e] text-[#e5e2e1] antialiased">
        {children}
      </body>
    </html>
  );
}
