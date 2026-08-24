import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ActivityRings } from "@/components/ActivityRings";
import { OrbitMark, OrbitWordmark } from "@/components/BrandMark";
import { MomentumOrbit } from "@/components/MomentumOrbit";
import { createClient } from "@/lib/supabase/server";
import {
  MOMENTUM_DECAY,
  ORBIT_DAY_SCORE,
  getAltitudeSeries,
  getOrbitTier,
  getScoreForAltitude,
  orbitTiers,
} from "@/lib/momentum";

export const metadata: Metadata = {
  alternates: { canonical: "/welcome" },
  description:
    "Orbit turns tasks, training and money into one number that climbs when you show up and decays when you do not. No streak to reset.",
  openGraph: {
    description:
      "Tasks, training and money as one number that climbs when you show up — and decays when you do not.",
    siteName: "Orbit",
    title: "Orbit — your day has an altitude",
    type: "website",
  },
  title: "Your day has an altitude",
};

/** A fortnight of an ordinary, imperfect month — the same data both charts use. */
const sampleScores = [
  62, 78, 0, 72, 84, 60, 76, 88, 92, 0, 58, 80, 90, 76,
];

export default async function WelcomePage() {
  let signedIn = false;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    signedIn = Boolean(data?.claims);
  } catch {
    signedIn = false;
  }

  const primary = signedIn
    ? { href: "/", label: "Open your dashboard" }
    : { href: "/login", label: "Start your orbit" };

  return (
    <div className="min-h-[100dvh] bg-[var(--canvas)] text-[var(--text-primary)]">
      <header className="sticky top-0 z-40 border-b border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--canvas)_78%,transparent)] backdrop-blur-xl">
        <div className="page-container flex items-center justify-between gap-4 !py-3">
          <Link
            aria-label="Orbit home"
            className="inline-flex min-h-11 items-center"
            href="/welcome"
          >
            <OrbitWordmark size={26} />
          </Link>
          <nav aria-label="Landing sections" className="hidden gap-6 md:flex">
            <HeaderLink href="#momentum">Momentum</HeaderLink>
            <HeaderLink href="#rings">Rings</HeaderLink>
            <HeaderLink href="#pricing">Pricing</HeaderLink>
          </nav>
          <div className="flex items-center gap-2">
            {signedIn ? null : (
              <Link
                className="ui-button ui-button--secondary hidden sm:inline-flex"
                href="/login"
              >
                Sign in
              </Link>
            )}
            <Link className="ui-button ui-button--primary" href={primary.href}>
              {signedIn ? "Dashboard" : "Start free"}
            </Link>
          </div>
        </div>
      </header>

      <main className="app-shell !pb-0" id="main-content" tabIndex={-1}>
        <Hero primary={primary} />
        <MomentumSection />
        <TodaySection />
        <RingsSection />
        <ShareSection />
        <PricingSection primaryHref={primary.href} />
        <FaqSection />
      </main>

      <footer className="border-t border-[var(--border-subtle)] py-10">
        <div className="page-container flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <OrbitWordmark size={24} />
            <p className="mt-3 max-w-sm text-[13px] leading-5 text-[var(--text-muted)]">
              Built for one person who kept forgetting to open his own dashboard.
              The mechanic is what fixed it.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-6 text-[13px] text-[var(--text-secondary)]">
            <Link className="inline-flex min-h-11 items-center hover:text-white" href="#momentum">
              How it works
            </Link>
            <Link className="inline-flex min-h-11 items-center hover:text-white" href="#pricing">
              Pricing
            </Link>
            <Link className="inline-flex min-h-11 items-center hover:text-white" href="/login">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function HeaderLink({ children, href }: { children: ReactNode; href: string }) {
  return (
    <Link
      className="inline-flex min-h-11 items-center text-[13px] font-semibold text-[var(--text-secondary)] transition hover:text-white"
      href={href}
    >
      {children}
    </Link>
  );
}

function Hero({ primary }: { primary: { href: string; label: string } }) {
  const series = getAltitudeSeries(
    sampleScores.map((score, index) => ({ date: `d${index}`, score })),
  );
  const altitude = series.at(-1)?.altitude ?? 0;
  const tier = getOrbitTier(altitude);
  const holdScore = getScoreForAltitude(altitude, tier.floor);
  const holdLine = holdScore
    ? `Finish today at ${holdScore}% to hold ${tier.name}.`
    : `${tier.name} holds even on an empty day.`;

  return (
    <section className="page-container pt-10 sm:pt-16">
      <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div>
          <p className="label-caps text-[var(--accent-primary)]">
            Personal operating system
          </p>
          <h1 className="editorial-display mt-4 text-[44px] leading-[48px] text-white sm:text-[64px] sm:leading-[66px]">
            Your day has an altitude.
          </h1>
          <p className="mt-5 max-w-xl text-[16px] leading-7 text-[var(--text-secondary)]">
            Orbit turns tasks, training and money into one number. It climbs on
            the days you show up and decays on the days you don’t — so there is
            always something to protect, and never a zero to be ashamed of.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link className="ui-button ui-button--primary px-6" href={primary.href}>
              {primary.label}
            </Link>
            <Link className="ui-button ui-button--secondary px-6" href="#momentum">
              See the mechanic
            </Link>
          </div>
          <p className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-[var(--text-muted)]">
            <span>Runs on your own Supabase project</span>
            <span aria-hidden="true">·</span>
            <span>Installs to your home screen</span>
            <span aria-hidden="true">·</span>
            <span>No feed, no ads, no trackers</span>
          </p>
        </div>

        <div className="relative mx-auto w-full max-w-[440px]">
          <div className="surface-hero p-5 sm:p-6 lg:pb-[132px]">
            <p className="label-caps text-[var(--text-secondary)]">Today</p>
            <h2 className="mt-2 text-[22px] font-semibold tracking-[-0.02em] text-white">
              2 of 3 rings closed.
            </h2>
            <div className="mt-4 grid gap-5 sm:grid-cols-[minmax(0,150px)_minmax(0,1fr)] sm:items-center">
              <div className="mx-auto w-full max-w-[160px]">
                <ActivityRings finance={100} fitness={100} tasks={72} />
              </div>
              <dl className="grid gap-2.5">
                <HeroStat color="var(--ring-tasks-to)" label="Tasks" value="5/7" />
                <HeroStat color="var(--ring-fitness-to)" label="Fitness" value="1/1" />
                <HeroStat color="var(--ring-finance-to)" label="Finance" value="2/2" />
              </dl>
            </div>
          </div>

          <div className="surface-secondary mt-4 flex items-center gap-4 p-4 lg:absolute lg:bottom-5 lg:left-5 lg:right-5 lg:mt-0">
            <div className="w-[76px] shrink-0">
              <MomentumOrbit
                altitude={altitude}
                projected={altitude}
                series={series}
                tier={tier}
              />
            </div>
            <div className="min-w-0">
              <p className="label-caps text-[var(--text-muted)]">Altitude</p>
              <p className="metric-value text-[22px] font-semibold text-white">
                {altitude}
                <span className="ml-2 text-[13px] font-normal text-[var(--text-secondary)]">
                  {tier.name}
                </span>
              </p>
              <p className="mt-0.5 text-[12px] leading-4 text-[var(--text-secondary)]">
                {holdLine}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroStat({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="flex items-center gap-2 text-[13px] font-semibold text-white">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: color }}
        />
        {label}
      </dt>
      <dd className="metric-value text-[15px] font-semibold" style={{ color }}>
        {value}
      </dd>
    </div>
  );
}

function MomentumSection() {
  const points = sampleScores.map((score, index) => ({
    date: `d${index}`,
    score,
  }));
  const altitudes = getAltitudeSeries(points).map((point) => point.altitude);
  const streaks: number[] = [];
  let running = 0;
  for (const point of points) {
    running = (point.score ?? 0) >= ORBIT_DAY_SCORE ? running + 1 : 0;
    streaks.push(running);
  }
  const streakScale = Math.max(...streaks, 1);

  return (
    <section className="page-container scroll-mt-24 pt-20 sm:pt-28" id="momentum">
      <SectionIntro
        eyebrow="The mechanic"
        lead="Both charts are the same fortnight: two missed days in an otherwise decent run."
        title="A streak punishes you once. An orbit keeps negotiating."
      />
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <article className="surface-primary p-5 sm:p-6">
          <h3 className="card-title text-white">What a streak does</h3>
          <p className="mt-2 text-[14px] leading-6 text-[var(--text-secondary)]">
            Miss day three and the count restarts. Build it back for a week,
            miss day ten, and it restarts again. The number that was meant to
            motivate you has become a receipt for failing.
          </p>
          <Sparkline
            color="var(--danger)"
            label="Streak, in days"
            values={streaks.map((value) => (value / streakScale) * 100)}
          />
        </article>
        <article className="surface-primary p-5 sm:p-6">
          <h3 className="card-title text-white">What an orbit does</h3>
          <p className="mt-2 text-[14px] leading-6 text-[var(--text-secondary)]">
            The same two days cost {Math.round((1 - MOMENTUM_DECAY) * 100)}% of
            your altitude each. Enough to feel, never enough to quit over, and
            the rest of the fortnight still counts for something.
          </p>
          <Sparkline
            color="var(--accent-primary)"
            label="Altitude, 0 to 100"
            values={altitudes}
          />
        </article>
      </div>
      <div className="surface-secondary mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 p-4 sm:p-5">
        <p className="metric-value text-[15px] font-semibold text-white">
          altitude today = {MOMENTUM_DECAY} × yesterday +{" "}
          {(1 - MOMENTUM_DECAY).toFixed(2)} × what you did
        </p>
        <p className="text-[13px] text-[var(--text-secondary)]">
          That is the whole engine. It is printed here because nothing about
          your progress should be a black box.
        </p>
      </div>
    </section>
  );
}

function TodaySection() {
  return (
    <section className="page-container pt-20 sm:pt-28">
      <SectionIntro
        eyebrow="The daily hook"
        lead="Orbit answers the only question that matters before the day starts."
        title="One number tells you what today has to be."
      />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <FeatureCard
          detail="The exact score that keeps you in your tier. Not a vague nudge — a threshold you can clear before lunch."
          title="Finish today at 49%"
          value="Hold score"
        />
        <FeatureCard
          detail="A day at or above 50% counts. One missed day a week is absorbed as an aerobrake, so a bad Tuesday never erases a good quarter."
          title="14 days in orbit"
          value="Days in orbit"
        />
        <FeatureCard
          detail="Every week races the same week seven days ago, over the days both weeks have reached. The only opponent is one you have already beaten once."
          title="64 points ahead of last week"
          value="Ghost race"
        />
      </div>
    </section>
  );
}

function RingsSection() {
  return (
    <section className="page-container scroll-mt-24 pt-20 sm:pt-28" id="rings">
      <SectionIntro
        eyebrow="What is inside"
        lead="Three areas, one glance, and the same ring language everywhere in the app."
        title="Tasks, training and money — closed or not."
      />
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <RingCard
          color="var(--ring-tasks-to)"
          detail="Plan the day, carry what slipped, and keep an immutable completion history. Categories learn from what you actually do."
          title="Tasks"
        />
        <RingCard
          color="var(--ring-fitness-to)"
          detail="A reusable weekly plan separated from dated training results, so editing next week never rewrites what you already lifted."
          title="Fitness"
        />
        <RingCard
          color="var(--ring-finance-to)"
          detail="Import a monthly bank statement, review every row, and keep only the normalised transactions. The PDF is never stored."
          title="Finance"
        />
      </div>
    </section>
  );
}

function ShareSection() {
  return (
    <section className="page-container pt-20 sm:pt-28">
      <div className="surface-hero grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)] lg:items-center">
        <div>
          <p className="label-caps text-[var(--accent-primary)]">The day card</p>
          <h2 className="editorial-display mt-3 text-[32px] leading-[38px] text-white sm:text-[40px] sm:leading-[46px]">
            Proof you can post.
          </h2>
          <p className="mt-4 max-w-xl text-[15px] leading-7 text-[var(--text-secondary)]">
            One tap renders your orbit, tier, run and verdict as an image built
            entirely on your device. Share it, or don’t — nothing is uploaded
            unless you choose to send it.
          </p>
          <ul className="mt-6 grid gap-2 text-[14px] text-[var(--text-secondary)]">
            <Bullet>Rendered locally, never on a server</Bullet>
            <Bullet>Native share sheet on a phone, PNG anywhere else</Bullet>
            <Bullet>Your numbers only — no leaderboard, no strangers</Bullet>
          </ul>
        </div>
        <Image
          alt="An Orbit day card showing an altitude of 65 in Mid orbit, a 14 day run, and the verdict that you are 64 points ahead of last week."
          className="mx-auto h-auto w-full max-w-[300px] rounded-[20px] border border-[var(--border-subtle)]"
          height={1350}
          src="/day-card-sample.png"
          width={1080}
        />
      </div>
    </section>
  );
}

function PricingSection({ primaryHref }: { primaryHref: string }) {
  return (
    <section className="page-container scroll-mt-24 pt-20 sm:pt-28" id="pricing">
      <SectionIntro
        eyebrow="Pricing"
        lead="Orbit is a tool, not a subscription trap. The mechanic is free forever."
        title="Bring your own database, or let Orbit host it."
      />
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <article className="surface-primary flex flex-col p-6">
          <p className="label-caps text-[var(--text-secondary)]">Self-hosted</p>
          <p className="mt-3 flex items-baseline gap-2">
            <span className="metric-value text-[40px] font-semibold text-white">
              Free
            </span>
            <span className="text-[13px] text-[var(--text-muted)]">forever</span>
          </p>
          <ul className="mt-5 grid gap-2 text-[14px] text-[var(--text-secondary)]">
            <Bullet>Every feature, including momentum and day cards</Bullet>
            <Bullet>Your own Supabase project and row-level security</Bullet>
            <Bullet>Installs to your home screen as an app</Bullet>
          </ul>
          <Link
            className="ui-button ui-button--secondary mt-6 w-full"
            href={primaryHref}
          >
            Start free
          </Link>
        </article>

        <article className="surface-hero relative flex flex-col p-6">
          <span className="ui-badge absolute right-5 top-5 text-[var(--accent-primary)]">
            Planned
          </span>
          <p className="label-caps text-[var(--accent-primary)]">Hosted</p>
          <p className="mt-3 flex items-baseline gap-2">
            <span className="metric-value text-[40px] font-semibold text-white">
              €5
            </span>
            <span className="text-[13px] text-[var(--text-muted)]">
              per month, when it ships
            </span>
          </p>
          <ul className="mt-5 grid gap-2 text-[14px] text-[var(--text-secondary)]">
            <Bullet>Managed database and backups</Bullet>
            <Bullet>One evening reminder carrying your hold score</Bullet>
            <Bullet>Records and history beyond the 60-day window</Bullet>
          </ul>
          <p className="mt-6 rounded-[var(--radius-control)] border border-[var(--border-subtle)] p-3 text-[12px] leading-5 text-[var(--text-muted)]">
            Not open yet, and not charged for yet. Self-hosted Orbit is the
            whole product today.
          </p>
        </article>
      </div>
    </section>
  );
}

function FaqSection() {
  const faq = [
    {
      answer:
        "Everything lives in a Supabase project you control, behind row-level security. Orbit has no analytics, no third-party scripts, and no way to read your rows.",
      question: "Where does my data live?",
    },
    {
      answer:
        "It is derived from what you already logged — tasks, training and cleared payments — so there is no separate score to maintain and nothing to fake.",
      question: "Is the altitude another thing to update?",
    },
    {
      answer:
        "Add it to your home screen from Safari or Chrome. It opens standalone, without browser chrome, and remembers your session.",
      question: "Can I use it as a phone app?",
    },
    {
      answer: `A day at or above ${ORBIT_DAY_SCORE}% counts as a day in orbit, and the tiers run from ${orbitTiers[0].name} to ${orbitTiers.at(-1)?.name}. All of it is documented in the repository, formulas included.`,
      question: "What exactly counts?",
    },
  ];

  return (
    <section className="page-container py-20 sm:py-28">
      <SectionIntro eyebrow="Questions" title="The short answers." />
      <dl className="mt-8 grid gap-3 md:grid-cols-2">
        {faq.map((item) => (
          <div className="surface-primary p-5" key={item.question}>
            <dt className="text-[15px] font-semibold text-white">
              {item.question}
            </dt>
            <dd className="mt-2 text-[14px] leading-6 text-[var(--text-secondary)]">
              {item.answer}
            </dd>
          </div>
        ))}
      </dl>
      <div className="surface-hero mt-10 flex flex-col items-center gap-5 p-8 text-center sm:p-12">
        <OrbitMark className="text-[var(--accent-primary)]" size={44} />
        <h2 className="editorial-display max-w-2xl text-[32px] leading-[38px] text-white sm:text-[44px] sm:leading-[50px]">
          Start at zero. You only stay there by choosing to.
        </h2>
        <Link className="ui-button ui-button--primary px-7" href="/login">
          Start your orbit
        </Link>
      </div>
    </section>
  );
}

function SectionIntro({
  eyebrow,
  lead,
  title,
}: {
  eyebrow: string;
  lead?: string;
  title: string;
}) {
  return (
    <div className="max-w-3xl">
      <p className="label-caps text-[var(--accent-primary)]">{eyebrow}</p>
      <h2 className="editorial-display mt-3 text-[30px] leading-[36px] text-white sm:text-[40px] sm:leading-[46px]">
        {title}
      </h2>
      {lead ? (
        <p className="mt-4 text-[15px] leading-7 text-[var(--text-secondary)]">
          {lead}
        </p>
      ) : null}
    </div>
  );
}

function FeatureCard({
  detail,
  title,
  value,
}: {
  detail: string;
  title: string;
  value: string;
}) {
  return (
    <article className="surface-primary p-5 sm:p-6">
      <p className="label-caps text-[var(--text-muted)]">{value}</p>
      <p className="metric-value mt-3 text-[22px] font-semibold leading-7 text-white">
        {title}
      </p>
      <p className="mt-3 text-[14px] leading-6 text-[var(--text-secondary)]">
        {detail}
      </p>
    </article>
  );
}

function RingCard({
  color,
  detail,
  title,
}: {
  color: string;
  detail: string;
  title: string;
}) {
  return (
    <article className="surface-primary p-5 sm:p-6">
      <span
        aria-hidden="true"
        className="block h-1.5 w-10 rounded-full"
        style={{ backgroundColor: color }}
      />
      <h3 className="card-title mt-4 text-white">{title}</h3>
      <p className="mt-2 text-[14px] leading-6 text-[var(--text-secondary)]">
        {detail}
      </p>
    </article>
  );
}

function Bullet({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span
        aria-hidden="true"
        className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-primary)]"
      />
      <span>{children}</span>
    </li>
  );
}

function Sparkline({
  color,
  label,
  values,
}: {
  color: string;
  label: string;
  values: number[];
}) {
  const width = 320;
  const height = 96;
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const points = values.map((value, index) => ({
    x: index * step,
    y: height - (Math.max(0, Math.min(100, value)) / 100) * (height - 8) - 4,
  }));
  const line = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
  const area = `${line} L ${width} ${height} L 0 ${height} Z`;

  return (
    <figure className="mt-5">
      <svg
        aria-hidden="true"
        className="h-24 w-full"
        preserveAspectRatio="none"
        viewBox={`0 0 ${width} ${height}`}
      >
        <path d={area} fill={color} fillOpacity={0.1} />
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2.5}
        />
      </svg>
      <figcaption className="mt-2 text-[12px] text-[var(--text-muted)]">
        {label}
      </figcaption>
    </figure>
  );
}
