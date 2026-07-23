import Link from "next/link";
import type { ReactNode } from "react";
import { LinkPendingIndicator } from "@/components/LinkPendingIndicator";
import { ProfileMenu } from "@/components/ProfileMenu";

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

export function AppNavigation({
  active,
  settings,
  userEmail,
}: {
  active: NavKey;
  settings?: ReactNode;
  userEmail: string;
}) {
  return (
    <>
      <nav className="fixed left-0 top-0 z-40 hidden h-screen w-[112px] border-r border-[var(--border-subtle)] bg-[#111112]/90 backdrop-blur-2xl md:block">
        <div className="flex h-full flex-col items-center justify-between px-4 py-6">
          <Link className="flex flex-col items-center gap-2" href="/">
            <LogoMark />
            <span className="text-[13px] font-semibold text-white">Orbit</span>
            <LinkPendingIndicator label="Loading Overview" />
          </Link>

          <div className="flex w-full flex-col items-stretch gap-2 rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.035),0_18px_42px_rgba(0,0,0,0.28)]">
            {navItems.map((item) => (
              <Link
                aria-current={active === item.key ? "page" : undefined}
                className={`relative flex min-h-[64px] flex-col items-center justify-center gap-1 overflow-hidden rounded-[18px] px-2 py-2 text-[12px] font-semibold transition duration-150 ${
                  active === item.key
                    ? "bg-white/[0.08] text-white"
                    : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-white"
                }`}
                href={item.href}
                key={item.key}
              >
                {active === item.key ? (
                  <span aria-hidden="true" className="absolute inset-y-3 left-0 w-0.5 rounded-full bg-[var(--accent-primary)]" />
                ) : null}
                {item.icon}
                {item.label}
                <LinkPendingIndicator label={`Loading ${item.label}`} />
              </Link>
            ))}
          </div>

          <div aria-hidden="true" className="h-11" />
        </div>
      </nav>

      <nav className="fixed bottom-0 left-0 z-40 grid w-full grid-cols-4 border-t border-[var(--border-subtle)] bg-[#181819]/92 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur-2xl md:hidden">
        {navItems.map((item) => (
          <Link
            aria-current={active === item.key ? "page" : undefined}
            className={`relative flex min-w-0 flex-col items-center justify-center rounded-[16px] p-2 text-[12px] font-semibold transition duration-150 ${
              active === item.key
                ? "bg-white/[0.08] text-white"
                : "text-[var(--text-secondary)] hover:bg-white/10 hover:text-white"
            }`}
            href={item.href}
            key={item.key}
          >
            {active === item.key ? (
              <span aria-hidden="true" className="absolute inset-x-6 -top-2 h-0.5 rounded-full bg-[var(--accent-primary)]" />
            ) : null}
            {item.icon}
            <span className="mt-1">{item.label}</span>
            <LinkPendingIndicator label={`Loading ${item.label}`} />
          </Link>
        ))}
      </nav>
      <ProfileMenu userEmail={userEmail}>{settings}</ProfileMenu>
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
