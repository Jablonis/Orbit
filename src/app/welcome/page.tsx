import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ActivityRings } from "@/components/ActivityRings";
import { OrbitMark } from "@/components/BrandMark";
import { OrbitInstrument } from "@/components/landing/OrbitInstrument";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/Reveal";
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

/** A fortnight of an ordinary, imperfect month — the same data every chart uses. */
const sampleScores = [
  62, 78, 0, 72, 84, 60, 76, 88, 92, 0, 58, 80, 90, 76,
];

const series = getAltitudeSeries(
  sampleScores.map((score, index) => ({ date: `d${index}`, score })),
);
const altitude = series.at(-1)?.altitude ?? 0;
const tier = getOrbitTier(altitude);
const holdScore = getScoreForAltitude(altitude, tier.floor);

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
    : { href: "/login", label: "Create your Orbit" };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <CornerNav primary={primary} signedIn={signedIn} />

      <main id="main-content" tabIndex={-1}>
        <Hero primary={primary} />
        <SystemsSection />
        <MechanicSection />
        <TodaySection />
        <DayCardSection />
        <PricingSection primaryHref={primary.href} />
        <FaqSection />
        <ClosingSection primary={primary} />
      </main>

      <footer className="border-t border-border">
        <div className="landing-container flex flex-col gap-6 py-10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <OrbitMark className="text-[var(--accent-primary)]" size={22} />
            <p className="mt-4 max-w-sm text-[13px] leading-5 text-muted-foreground">
              Built for one person who kept forgetting to open his own
              dashboard. The mechanic is what fixed it.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-1">
            <FooterLink href="#systems">Systems</FooterLink>
            <FooterLink href="#mechanic">Rhythm</FooterLink>
            <FooterLink href="#pricing">Pricing</FooterLink>
            <FooterLink href="/login">Sign in</FooterLink>
          </div>
        </div>
      </footer>
    </div>
  );
}

function CornerNav({
  primary,
  signedIn,
}: {
  primary: { href: string; label: string };
  signedIn: boolean;
}) {
  return (
    <header className="sticky top-0 z-50 bg-background/85 backdrop-blur-xl">
      <div className="landing-container flex items-center justify-between gap-4 py-4">
        <Link
          aria-label="Orbit home"
          className="inline-flex min-h-11 items-center gap-2.5"
          href="/welcome"
        >
          <OrbitMark className="text-[var(--accent-primary)]" size={22} />
          <span
            className="text-[15px] font-bold uppercase"
            style={{ fontStretch: "115%", letterSpacing: "0.08em" }}
          >
            Orbit
          </span>
        </Link>

        <nav aria-label="Sections" className="hidden gap-8 md:flex">
          <NavLink href="#systems">Systems</NavLink>
          <NavLink href="#mechanic">Rhythm</NavLink>
          <NavLink href="#pricing">Pricing</NavLink>
        </nav>

        <div className="flex items-center gap-5">
          {signedIn ? null : (
            <Link
              className="hidden min-h-11 items-center text-[13px] font-semibold text-muted-foreground transition hover:text-foreground sm:inline-flex"
              href="/login"
            >
              Sign in
            </Link>
          )}
          <Link className="ui-button ui-button--primary" href={primary.href}>
            {signedIn ? "Dashboard" : "Create your Orbit"}
          </Link>
        </div>
      </div>
    </header>
  );
}

function NavLink({ children, href }: { children: ReactNode; href: string }) {
  return (
    <Link
      className="label-caps inline-flex min-h-11 items-center text-muted-foreground transition hover:text-foreground"
      href={href}
    >
      {children}
    </Link>
  );
}

function FooterLink({ children, href }: { children: ReactNode; href: string }) {
  return (
    <Link
      className="label-caps inline-flex min-h-11 items-center text-muted-foreground transition hover:text-foreground"
      href={href}
    >
      {children}
    </Link>
  );
}

function Hero({ primary }: { primary: { href: string; label: string } }) {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(155deg,var(--plum-tint)_0%,var(--tasks-tint)_48%,var(--finance-tint)_100%)] opacity-75"
      />

      <div className="landing-container relative grid items-center gap-12 py-16 sm:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)]">
        <div>
          <p className="label-caps text-muted-foreground">
            A personal operating system
          </p>
          <h1 className="display-mega mt-6 text-foreground">
            Your day has an altitude.
          </h1>
          <p className="mt-7 max-w-xl text-[18px] leading-8 text-muted-foreground sm:text-[20px] sm:leading-9">
            Tasks, training and money become one number that climbs when you
            show up and decays when you don’t. No streak to reset, nothing that
            reaches zero.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link href={primary.href}>{primary.label}</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="#mechanic">See the system</Link>
            </Button>
          </div>

          <dl className="mt-10 grid max-w-md grid-cols-3 gap-3">
            <HeroFigure label="Altitude" value={String(altitude)} />
            <HeroFigure label="Tier" value={tier.name.split(" ")[0]} />
            <HeroFigure
              label="Hold"
              value={holdScore ? `${holdScore}%` : "Safe"}
            />
          </dl>
        </div>

        <OrbitInstrument />
      </div>
    </section>
  );
}

function HeroFigure({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-card p-4 shadow-[0_1px_2px_rgba(27,26,31,0.05)]">
      <dt className="label-caps text-muted-foreground">{label}</dt>
      <dd className="metric-value mt-2 text-[26px] font-semibold leading-none text-foreground">
        {value}
      </dd>
    </div>
  );
}

function SystemsSection() {
  const channels = [
    {
      code: "CH-01",
      detail:
        "What needs your attention. Overdue, today, upcoming — one queue that rolls unfinished work forward and archives itself.",
      name: "Tasks",
      tone: "var(--tasks)",
    },
    {
      code: "CH-02",
      detail:
        "What you planned, and what happened. One reusable weekly plan, logged week by week, without rewriting your history.",
      name: "Fitness",
      tone: "var(--fitness)",
    },
    {
      code: "CH-03",
      detail:
        "What moved and what still needs review. Imported statements wait until you confirm them; the file is never stored.",
      name: "Finance",
      tone: "var(--finance)",
    },
  ];

  return (
    <Section eyebrow="The instrument" id="systems" title="Three systems, one glance.">
      <p className="max-w-2xl text-[15px] leading-7 text-muted-foreground">
        Orbit connects what needs your attention, what you planned for your
        body, and what moved in your finances — without turning the day into
        noise.
      </p>

      <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)] lg:items-start">
        <div className="pin-figure mx-auto w-full max-w-[300px]">
          <ActivityRings finance={100} fitness={100} tasks={72} />
        </div>
        <div className="border-t border-border">
          {channels.map((channel) => (
            <article
              className="grid gap-3 border-b border-border py-10 sm:grid-cols-[120px_minmax(0,1fr)] sm:gap-6"
              key={channel.code}
            >
              <div className="flex items-center gap-2.5 sm:pt-1.5">
                <span
                  aria-hidden="true"
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: channel.tone }}
                />
                <span className="label-caps text-muted-foreground">
                  {channel.code}
                </span>
              </div>
              <div>
                <h3 className="text-[19px] font-semibold tracking-[-0.02em] text-foreground">
                  {channel.name}
                </h3>
                <p className="mt-2 max-w-xl text-[14px] leading-6 text-muted-foreground">
                  {channel.detail}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </Section>
  );
}

function MechanicSection() {
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
    <Section
      eyebrow="Rhythm"
      id="mechanic"
      title="A streak punishes you once. An orbit keeps negotiating."
    >
      <p className="max-w-2xl text-[15px] leading-7 text-muted-foreground">
        Both charts are the same fortnight: two missed days in an otherwise
        decent run.
      </p>

      <div className="mt-12 grid gap-4 lg:grid-cols-2">
        <Plate>
          <p className="label-caps text-muted-foreground">01 · Streak</p>
          <h3 className="mt-3 text-[19px] font-semibold tracking-[-0.02em] text-foreground">
            Back to zero, twice
          </h3>
          <p className="mt-2 text-[14px] leading-6 text-muted-foreground">
            Miss day three and the count restarts. Build it back for a week,
            miss day ten, and it restarts again.
          </p>
          <Sparkline
            color="var(--danger)"
            label="Streak, in days"
            values={streaks.map((value) => (value / streakScale) * 100)}
          />
        </Plate>
        <Plate>
          <p className="label-caps text-muted-foreground">02 · Altitude</p>
          <h3 className="mt-3 text-[19px] font-semibold tracking-[-0.02em] text-foreground">
            Down {Math.round((1 - MOMENTUM_DECAY) * 100)}%, not down to nothing
          </h3>
          <p className="mt-2 text-[14px] leading-6 text-muted-foreground">
            The same two days cost a slice of altitude each. Enough to feel,
            never enough to quit over.
          </p>
          <Sparkline
            color="var(--accent-primary)"
            label="Altitude, 0 to 100"
            values={altitudes}
          />
        </Plate>
      </div>

      <p className="metric-value mt-8 font-[family-name:var(--font-geist-mono)] text-[14px] leading-7 text-foreground">
        altitude today = {MOMENTUM_DECAY} × yesterday +{" "}
        {(1 - MOMENTUM_DECAY).toFixed(2)} × what you did
      </p>
      <p className="mt-2 max-w-2xl text-[13px] leading-6 text-muted-foreground">
        That is the whole engine, printed here on purpose. Nothing about your
        own progress should be a black box.
      </p>
    </Section>
  );
}

function TodaySection() {
  return (
    <Section eyebrow="The daily hook" title="One number tells you what today has to be.">
      <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)] lg:items-center">
        <div className="relative mx-auto w-full max-w-[260px]">
          <MomentumOrbit
            altitude={altitude}
            projected={altitude}
            series={series}
            tier={tier}
          />
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
            <div>
              <p className="metric-value text-[38px] font-semibold leading-none text-foreground">
                {altitude}
              </p>
              <p className="label-caps mt-2 text-muted-foreground">Altitude</p>
            </div>
          </div>
        </div>

        <dl className="border-t border-border">
          <Row
            detail="The exact score that keeps you in your tier. Not a nudge — a threshold you can clear before lunch."
            term={`Finish today at ${holdScore ?? 0}%`}
            label="Hold score"
          />
          <Row
            detail={`A day at or above ${ORBIT_DAY_SCORE}% counts. One missed day a week is absorbed as an aerobrake, so a bad Tuesday never erases a good quarter.`}
            term="14 days in orbit"
            label="Days in orbit"
          />
          <Row
            detail="Every week races the same week seven days ago, over the days both weeks have reached. The only opponent is one you have already beaten."
            term="64 points ahead of last week"
            label="Ghost race"
          />
        </dl>
      </div>
    </Section>
  );
}

function DayCardSection() {
  return (
    <Section eyebrow="The day card" title="Proof you can post.">
      <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,300px)] lg:items-center">
        <div>
          <p className="max-w-xl text-[15px] leading-7 text-muted-foreground">
            One tap renders your orbit, tier, run and verdict as an image built
            entirely on your device. Share it, or don’t — nothing is uploaded
            unless you choose to send it.
          </p>
          <ul className="mt-8 border-t border-border">
            <Bullet>Rendered locally, never on a server</Bullet>
            <Bullet>Native share sheet on a phone, PNG anywhere else</Bullet>
            <Bullet>Your numbers only — no leaderboard, no strangers</Bullet>
          </ul>
        </div>
        <Image
          alt="An Orbit day card showing an altitude of 65 in Mid orbit, a 14 day run, and the verdict that you are 64 points ahead of last week."
          className="mx-auto h-auto w-full max-w-[300px] rounded-2xl"
          height={1350}
          src="/day-card-sample.png"
          width={1080}
        />
      </div>
    </Section>
  );
}

function PricingSection({ primaryHref }: { primaryHref: string }) {
  return (
    <Section
      eyebrow="Pricing"
      id="pricing"
      title="Bring your own database, or let Orbit host it."
    >
      <div className="mt-12 grid gap-4 lg:grid-cols-2">
        <Plate>
          <p className="label-caps text-muted-foreground">Self-hosted</p>
          <p className="mt-4 flex items-baseline gap-3">
            <span className="metric-value text-[44px] font-semibold leading-none text-foreground">
              Free
            </span>
            <span className="label-caps text-muted-foreground">forever</span>
          </p>
          <ul className="mt-8 border-t border-border">
            <Bullet>Every feature, including momentum and day cards</Bullet>
            <Bullet>Your own Supabase project and row-level security</Bullet>
            <Bullet>Installs to your home screen as an app</Bullet>
          </ul>
          <Link
            className="ui-button ui-button--secondary mt-8 w-full"
            href={primaryHref}
          >
            Start free
          </Link>
        </Plate>

        <Plate>
          <div className="flex items-center justify-between gap-3">
            <p className="label-caps text-primary">Hosted</p>
            <p className="label-caps text-muted-foreground">Planned</p>
          </div>
          <p className="mt-4 flex items-baseline gap-3">
            <span className="metric-value text-[44px] font-semibold leading-none text-foreground">
              €5
            </span>
            <span className="label-caps text-muted-foreground">
              per month, when it ships
            </span>
          </p>
          <ul className="mt-8 border-t border-border">
            <Bullet>Managed database and backups</Bullet>
            <Bullet>One evening reminder carrying your hold score</Bullet>
            <Bullet>Records and history beyond the 60-day window</Bullet>
          </ul>
          <p className="mt-8 text-[12px] leading-5 text-muted-foreground">
            Not open yet, and not charged for yet. Self-hosted Orbit is the
            whole product today.
          </p>
        </Plate>
      </div>
    </Section>
  );
}

function FaqSection() {
  const faq = [
    {
      answer:
        "In a Supabase project you control, behind row-level security. Orbit has no analytics, no third-party scripts, and no way to read your rows.",
      question: "Where does my data live?",
    },
    {
      answer:
        "No. It is derived from what you already logged — tasks, training and cleared payments — so there is nothing extra to maintain and nothing to fake.",
      question: "Is the altitude another thing to update?",
    },
    {
      answer:
        "Add it to your home screen from Safari or Chrome. It opens standalone, without browser chrome, and keeps your session.",
      question: "Can I use it as a phone app?",
    },
    {
      answer: `A day at or above ${ORBIT_DAY_SCORE}% counts as a day in orbit, and the tiers run from ${orbitTiers[0].name} to ${orbitTiers.at(-1)?.name}. All of it is documented in the repository, formulas included.`,
      question: "What exactly counts?",
    },
  ];

  return (
    <Section eyebrow="Questions" title="The short answers.">
      <dl className="mt-12 grid gap-4 md:grid-cols-2">
        {faq.map((item) => (
          <div
            className="rounded-2xl bg-card p-6 shadow-[0_1px_2px_rgba(27,26,31,0.05)]"
            key={item.question}
          >
            <dt className="text-[15px] font-semibold text-foreground">
              {item.question}
            </dt>
            <dd className="mt-3 text-[14px] leading-6 text-muted-foreground">
              {item.answer}
            </dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}

function ClosingSection({
  primary,
}: {
  primary: { href: string; label: string };
}) {
  return (
    <section className="relative overflow-hidden border-t border-border">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(150deg,var(--plum-tint),var(--finance-tint))] opacity-70"
      />
      <div className="landing-container relative flex flex-col items-start gap-8 py-24 sm:py-32">
        <p className="label-caps text-muted-foreground">ORB-01</p>
        <h2 className="max-w-3xl text-[36px] font-semibold leading-[42px] tracking-[-0.035em] text-foreground sm:text-[52px] sm:leading-[58px]">
          Start at zero. You only stay there by choosing to.
        </h2>
        <Link className="ui-button ui-button--primary px-7" href={primary.href}>
          {primary.label}
        </Link>
      </div>
    </section>
  );
}

function Section({
  children,
  eyebrow,
  id,
  title,
}: {
  children: ReactNode;
  eyebrow: string;
  id?: string;
  title: string;
}) {
  return (
    <section
      className="landing-container scroll-mt-24 border-b border-border py-20 sm:py-28"
      id={id}
    >
      <Reveal>
      <p className="label-caps text-primary">{eyebrow}</p>
      <h2 className="mt-5 max-w-3xl text-[30px] font-semibold leading-[36px] tracking-[-0.035em] text-foreground sm:text-[42px] sm:leading-[48px]">
        {title}
      </h2>
      <div className="mt-6">{children}</div>
      </Reveal>
    </section>
  );
}

function Plate({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-card p-6 shadow-[0_1px_2px_rgba(27,26,31,0.05)] sm:p-8">
      {children}
    </div>
  );
}

function Row({
  detail,
  label,
  term,
}: {
  detail: string;
  label: string;
  term: string;
}) {
  return (
    <div className="grid gap-2 border-b border-border py-6 sm:grid-cols-[140px_minmax(0,1fr)] sm:gap-6">
      <dt className="label-caps text-muted-foreground">{label}</dt>
      <dd>
        <p className="metric-value text-[19px] font-semibold text-foreground">
          {term}
        </p>
        <p className="mt-2 max-w-xl text-[14px] leading-6 text-muted-foreground">
          {detail}
        </p>
      </dd>
    </div>
  );
}

function Bullet({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-3 border-b border-border py-3 text-[14px] leading-6 text-muted-foreground">
      <span
        aria-hidden="true"
        className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-primary"
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
  const height = 90;
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const points = values.map((value, index) => ({
    x: index * step,
    y: height - (Math.max(0, Math.min(100, value)) / 100) * (height - 8) - 4,
  }));
  const line = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  return (
    <figure className="mt-8">
      <svg
        aria-hidden="true"
        className="h-24 w-full"
        preserveAspectRatio="none"
        viewBox={`0 0 ${width} ${height}`}
      >
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <figcaption className="label-caps mt-3 text-muted-foreground">
        {label}
      </figcaption>
    </figure>
  );
}
