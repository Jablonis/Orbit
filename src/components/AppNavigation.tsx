import Link from "next/link";
import type { ReactNode } from "react";
import { OrbitMark } from "@/components/BrandMark";
import { LinkPendingIndicator } from "@/components/LinkPendingIndicator";
import { ProfileMenu } from "@/components/ProfileMenu";
import { QuickAdd } from "@/components/QuickAdd";
import type { RegionalPreferences } from "@/lib/preferences";

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
  profile,
  settings,
  userEmail,
}: {
  active: NavKey | null;
  profile?: RegionalPreferences;
  settings?: ReactNode;
  userEmail: string;
}) {
  return (
    <>
      <nav className="fixed left-0 top-0 z-40 hidden h-screen w-[104px] border-r border-border bg-card md:block">
        <div className="flex h-full flex-col items-center justify-between px-4 py-6">
          <Link className="flex flex-col items-center gap-2" href="/">
            <OrbitMark className="text-primary" size={30} />
            <span className="text-[13px] font-bold tracking-[-0.01em]">Orbit</span>
            <LinkPendingIndicator label="Loading Overview" />
          </Link>

          <div className="flex w-full flex-col items-stretch gap-2 rounded-[var(--radius-panel)] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-2 shadow-[inset_0_1px_0_rgba(244, 235, 221,0.035),0_18px_42px_rgba(0,0,0,0.28)]">
            {navItems.map((item) => (
              <Link
                aria-current={active === item.key ? "page" : undefined}
                className={`relative flex min-h-[62px] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[12px] font-semibold transition duration-150 ${
                  active === item.key
                    ? "bg-plum-tint text-plum-ink"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
                href={item.href}
                key={item.key}
              >

                {item.icon}
                {item.label}
                <LinkPendingIndicator label={`Loading ${item.label}`} />
              </Link>
            ))}
          </div>

          <div aria-hidden="true" className="h-11" />
        </div>
      </nav>

      <nav className="fixed bottom-0 left-0 z-40 grid w-full grid-cols-4 border-t border-border bg-card/95 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl md:hidden">
        {navItems.map((item) => (
          <Link
            aria-current={active === item.key ? "page" : undefined}
            className={`relative flex min-w-0 flex-col items-center justify-center rounded-2xl p-2 text-[12px] font-semibold transition duration-150 ${
              active === item.key
                ? "bg-plum-tint text-plum-ink"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
            href={item.href}
            key={item.key}
          >
            {active === item.key ? (
              <span aria-hidden="true" className="absolute inset-x-6 -top-2 h-0.5 rounded-full bg-primary" />
            ) : null}
            {item.icon}
            <span className="mt-1">{item.label}</span>
            <LinkPendingIndicator label={`Loading ${item.label}`} />
          </Link>
        ))}
      </nav>
      <QuickAdd />
      <ProfileMenu profile={profile} userEmail={userEmail}>{settings}</ProfileMenu>
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
