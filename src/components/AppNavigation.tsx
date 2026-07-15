"use client";

import Link from "next/link";
import { ReactNode } from "react";

type NavKey = "dashboard" | "fitness" | "tasks" | "finance";

const navItems: Array<{
  key: NavKey;
  label: string;
  href: string;
  icon: ReactNode;
}> = [
  { key: "dashboard", label: "Overview", href: "/", icon: <GridIcon /> },
  { key: "fitness", label: "Fitness", href: "/fitness", icon: <SparkIcon /> },
  { key: "tasks", label: "Tasks", href: "/tasks", icon: <CheckIcon /> },
  { key: "finance", label: "Finance", href: "/finance", icon: <WalletIcon /> },
];

export function AppNavigation({ active }: { active: NavKey }) {
  return (
    <>
      <nav className="fixed left-0 top-0 z-40 hidden h-screen w-[112px] border-r border-white/10 bg-[#111112]/86 backdrop-blur-2xl md:block">
        <div className="flex h-full flex-col items-center justify-between px-4 py-6">
          <Link className="flex flex-col items-center gap-2" href="/">
            <LogoMark />
            <span className="text-[13px] font-semibold text-white">Orbit</span>
          </Link>

          <div className="flex w-full flex-col items-stretch gap-2 rounded-[24px] border border-white/10 bg-[#1b1b1c] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_18px_42px_rgba(0,0,0,0.28)]">
            {navItems.map((item) => (
              <Link
                className={`flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-[18px] px-2 py-2 text-[11px] font-semibold transition ${
                  active === item.key
                    ? "bg-white text-[#161616] shadow-[0_0_22px_rgba(255,255,255,0.12)]"
                    : "text-[#c4c7c8] hover:bg-[#2f3031] hover:text-white"
                }`}
                href={item.href}
                key={item.key}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </div>

          <div className="flex flex-col items-center gap-3">
            <form action="/auth/logout" method="post">
              <button
                aria-label="Logout"
                className="relative grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-[#202123] text-[#c4c7c8] transition hover:bg-[#303133] hover:text-white"
                type="submit"
              >
                <LogoutIcon />
              </button>
            </form>
            <div
              aria-label="Profile"
              className="relative grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-[#202123] text-[#c4c7c8] transition hover:bg-[#303133] hover:text-white"
            >
              <BellIcon />
              <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-[#ff4fa3]" />
            </div>
            <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-full border border-white/10 bg-[conic-gradient(from_140deg,#ff4fa3,#60a5fa,#a3e635,#ff4fa3)] text-[12px] font-bold text-[#101011]">
              P
            </div>
          </div>
        </div>
      </nav>

      <nav className="fixed bottom-0 left-0 z-40 flex w-full items-center justify-around border-t border-white/10 bg-[#181819]/88 px-3 py-2 backdrop-blur-2xl md:hidden">
        {navItems.map((item) => (
          <Link
            className={`flex min-w-[70px] flex-col items-center justify-center rounded-[16px] p-2 text-[11px] font-semibold transition ${
              active === item.key
                ? "bg-white text-[#161616]"
                : "text-[#c4c7c8] hover:bg-white/10 hover:text-white"
            }`}
            href={item.href}
            key={item.key}
          >
            {item.icon}
            <span className="mt-1">{item.label}</span>
          </Link>
        ))}
        <form action="/auth/logout" method="post">
          <button
            aria-label="Logout"
            className="flex min-w-[54px] flex-col items-center justify-center rounded-[16px] p-2 text-[#c4c7c8] transition hover:bg-white/10 hover:text-white"
            type="submit"
          >
            <LogoutIcon />
            <span className="mt-1 text-[11px] font-semibold">Logout</span>
          </button>
        </form>
      </nav>
    </>
  );
}

function Svg({
  children,
  className = "h-4 w-4",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      {children}
    </svg>
  );
}

function LogoMark() {
  return (
    <svg className="h-9 w-9 text-white" fill="none" viewBox="0 0 36 36">
      <path
        d="M18 4 30 11v14l-12 7-12-7V11L18 4Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2.5"
      />
      <path
        d="M18 11 24 14.5v7L18 25l-6-3.5v-7L18 11Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2.5"
      />
      <path d="M18 11v7l6-3.5" stroke="currentColor" strokeWidth="2.5" />
      <path d="M18 18v7" stroke="currentColor" strokeWidth="2.5" />
    </svg>
  );
}

function GridIcon() {
  return (
    <Svg>
      <rect height="7" rx="1.5" width="7" x="3" y="3" />
      <rect height="7" rx="1.5" width="7" x="14" y="3" />
      <rect height="7" rx="1.5" width="7" x="3" y="14" />
      <rect height="7" rx="1.5" width="7" x="14" y="14" />
    </Svg>
  );
}

function SparkIcon() {
  return (
    <Svg>
      <path d="M4 19 9 9l4 6 3-4 4 8" />
    </Svg>
  );
}

function CheckIcon() {
  return (
    <Svg>
      <path d="m5 12 4 4L19 6" />
    </Svg>
  );
}

function WalletIcon() {
  return (
    <Svg>
      <path d="M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
      <path d="M16 14h5v-4h-5a2 2 0 0 0 0 4Z" />
      <path d="M3 7c0-2 1-3 3-3h12" />
    </Svg>
  );
}

function BellIcon() {
  return (
    <Svg className="h-5 w-5">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </Svg>
  );
}

function LogoutIcon() {
  return (
    <Svg className="h-5 w-5">
      <path d="M10 17 15 12 10 7" />
      <path d="M15 12H3" />
      <path d="M21 3v18" />
    </Svg>
  );
}
