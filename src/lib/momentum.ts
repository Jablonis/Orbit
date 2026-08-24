/**
 * Orbit momentum engine.
 *
 * Streaks reset to zero and stop mattering. Momentum models the day as
 * orbital altitude instead: every scored day either lifts the orbit or lets it
 * decay. The engine is pure and derives everything from the same productivity
 * points the dashboard already computes, so no additional state can drift.
 */

export type MomentumPoint = {
  date: string;
  score: number | null;
};

export type OrbitTierId =
  | "grounded"
  | "liftoff"
  | "low-orbit"
  | "mid-orbit"
  | "geostationary"
  | "escape-velocity";

export type OrbitTier = {
  blurb: string;
  color: string;
  floor: number;
  id: OrbitTierId;
  name: string;
};

export type MomentumStatus = "climbing" | "decaying" | "holding";

export type Momentum = {
  altitude: number;
  daysMeasured: number;
  holdScore: number | null;
  nextTier: OrbitTier | null;
  nextTierScore: number | null;
  projected: number;
  series: AltitudePoint[];
  status: MomentumStatus;
  tier: OrbitTier;
  todayScore: number | null;
  weekChange: number;
};

export type AltitudePoint = {
  altitude: number;
  date: string;
  score: number | null;
};

export type StreakState = {
  atRisk: boolean;
  bestStreak: number;
  gracedDates: string[];
  scoreToSecureToday: number;
  secureToday: boolean;
  streak: number;
};

export type GhostRace = {
  current: number;
  daysCompared: number;
  delta: number;
  previous: number;
  status: "ahead" | "behind" | "level";
  verdict: string;
};

export type MomentumRecords = {
  bestAltitude: number;
  bestAltitudeDate: string | null;
  bestDay: number;
  bestDayDate: string | null;
  orbitDays: number;
  windowDays: number;
};

/** Share of altitude retained by a day with no logged progress. */
export const MOMENTUM_DECAY = 0.85;

/** Minimum daily score that counts as a day spent in orbit. */
export const ORBIT_DAY_SCORE = 50;

/** Missed days inside this window can be absorbed once by an aerobrake. */
export const AEROBRAKE_WINDOW_DAYS = 7;

export const orbitTiers: OrbitTier[] = [
  {
    blurb: "The orbit has decayed. One honest day starts the climb back.",
    color: "var(--danger)",
    floor: 0,
    id: "grounded",
    name: "Grounded",
  },
  {
    blurb: "Thrust is on. Keep two days together and the altitude holds.",
    color: "var(--warning)",
    floor: 20,
    id: "liftoff",
    name: "Liftoff",
  },
  {
    blurb: "Stable but low. Drag is still faster than the climb.",
    color: "var(--accent-info)",
    floor: 40,
    id: "low-orbit",
    name: "Low orbit",
  },
  {
    blurb: "A real orbit. Most days now carry the ones you miss.",
    color: "var(--accent-focus)",
    floor: 60,
    id: "mid-orbit",
    name: "Mid orbit",
  },
  {
    blurb: "Locked in. The routine holds itself up without heroics.",
    color: "var(--accent-primary)",
    floor: 78,
    id: "geostationary",
    name: "Geostationary",
  },
  {
    blurb: "Rare air. Almost nothing is being left on the ground.",
    color: "var(--accent-highlight)",
    floor: 92,
    id: "escape-velocity",
    name: "Escape velocity",
  },
];

function clampScore(value: number) {
  return Math.max(0, Math.min(100, value));
}

function scoreOf(point: MomentumPoint) {
  return point.score === null ? 0 : clampScore(point.score);
}

export function getOrbitTier(altitude: number): OrbitTier {
  const value = clampScore(altitude);
  return (
    [...orbitTiers].reverse().find((tier) => value >= tier.floor) ??
    orbitTiers[0]
  );
}

export function getNextOrbitTier(tier: OrbitTier): OrbitTier | null {
  const index = orbitTiers.findIndex((item) => item.id === tier.id);
  return orbitTiers[index + 1] ?? null;
}

/**
 * Score required today so tomorrow's altitude still clears `floor`.
 * Returns null when the target cannot be reached in a single day.
 */
export function getScoreForAltitude(altitude: number, floor: number) {
  const required = (floor - MOMENTUM_DECAY * altitude) / (1 - MOMENTUM_DECAY);
  if (required <= 0) return 0;
  if (required > 100) return null;
  return Math.ceil(required);
}

export function getAltitudeSeries(points: MomentumPoint[]): AltitudePoint[] {
  let altitude = 0;
  return points.map((point) => {
    altitude = MOMENTUM_DECAY * altitude + (1 - MOMENTUM_DECAY) * scoreOf(point);
    return {
      altitude: Math.round(clampScore(altitude)),
      date: point.date,
      score: point.score,
    };
  });
}

export function getMomentum(points: MomentumPoint[], today: string): Momentum {
  const history = points.filter((point) => point.date < today);
  const todayPoint = points.find((point) => point.date === today) ?? null;
  const series = getAltitudeSeries(points);
  const settled = getAltitudeSeries(history);
  const altitude = settled.at(-1)?.altitude ?? 0;
  const todayScore = todayPoint ? todayPoint.score : null;
  const projected = Math.round(
    clampScore(
      MOMENTUM_DECAY * altitude +
        (1 - MOMENTUM_DECAY) * (todayPoint ? scoreOf(todayPoint) : 0),
    ),
  );
  const tier = getOrbitTier(altitude);
  const nextTier = getNextOrbitTier(tier);
  const weekAgo = settled.at(-8)?.altitude ?? 0;

  return {
    altitude,
    daysMeasured: settled.length,
    holdScore: getScoreForAltitude(altitude, tier.floor),
    nextTier,
    nextTierScore: nextTier
      ? getScoreForAltitude(altitude, nextTier.floor)
      : null,
    projected,
    series,
    status:
      projected > altitude
        ? "climbing"
        : projected < altitude
          ? "decaying"
          : "holding",
    tier,
    todayScore,
    weekChange: altitude - weekAgo,
  };
}

/**
 * Consecutive days at or above the orbit-day score, where a single missed day
 * is absorbed as an aerobrake if no other miss happened within the window.
 * Today never breaks a streak; it is still open until the day ends.
 */
export function getStreak(points: MomentumPoint[], today: string): StreakState {
  const history = points.filter((point) => point.date <= today);
  const todayPoint = history.find((point) => point.date === today) ?? null;
  const closed = history.filter((point) => point.date < today);
  const gracedDates: string[] = [];
  let streak = todayPoint && scoreOf(todayPoint) >= ORBIT_DAY_SCORE ? 1 : 0;
  let missOffset: number | null = null;

  for (let index = closed.length - 1; index >= 0; index -= 1) {
    const point = closed[index];
    const offset = closed.length - index;
    if (scoreOf(point) >= ORBIT_DAY_SCORE) {
      streak += 1;
      continue;
    }
    if (missOffset !== null && offset - missOffset < AEROBRAKE_WINDOW_DAYS) {
      break;
    }
    missOffset = offset;
    gracedDates.push(point.date);
  }

  let best = 0;
  let running = 0;
  for (const point of history) {
    if (scoreOf(point) >= ORBIT_DAY_SCORE) {
      running += 1;
      best = Math.max(best, running);
      continue;
    }
    running = 0;
  }

  const secureToday = Boolean(
    todayPoint && scoreOf(todayPoint) >= ORBIT_DAY_SCORE,
  );

  return {
    atRisk: streak > 0 && !secureToday,
    bestStreak: Math.max(best, streak),
    gracedDates,
    scoreToSecureToday: secureToday
      ? 0
      : ORBIT_DAY_SCORE - (todayPoint ? scoreOf(todayPoint) : 0),
    secureToday,
    streak,
  };
}

/**
 * You against the version of you from exactly one week ago, compared only over
 * the days both weeks have actually reached.
 */
export function getGhostRace(
  current: MomentumPoint[],
  previous: MomentumPoint[],
  today: string,
): GhostRace {
  const played = current.filter((point) => point.date <= today);
  const days = played.length;
  const sum = (points: MomentumPoint[]) =>
    points.slice(0, days).reduce((total, point) => total + scoreOf(point), 0);
  const currentTotal = sum(played);
  const previousTotal = sum(previous);
  const delta = currentTotal - previousTotal;
  const status = delta > 0 ? "ahead" : delta < 0 ? "behind" : "level";

  return {
    current: currentTotal,
    daysCompared: days,
    delta,
    previous: previousTotal,
    status,
    verdict:
      days === 0
        ? "The race starts with today."
        : status === "ahead"
          ? `You are ${delta} points ahead of last week's you.`
          : status === "behind"
            ? `Last week's you is ${Math.abs(delta)} points ahead.`
            : "Dead level with last week's you.",
  };
}

export function getMomentumRecords(
  points: MomentumPoint[],
  today: string,
): MomentumRecords {
  const history = points.filter((point) => point.date <= today);
  const series = getAltitudeSeries(history);
  const bestDay = history.reduce<AltitudePoint | null>((best, point) => {
    if (point.score === null) return best;
    return best === null || point.score > (best.score ?? -1)
      ? { altitude: 0, date: point.date, score: point.score }
      : best;
  }, null);
  const bestAltitude = series.reduce<AltitudePoint | null>(
    (best, point) =>
      best === null || point.altitude > best.altitude ? point : best,
    null,
  );

  return {
    bestAltitude: bestAltitude?.altitude ?? 0,
    bestAltitudeDate: bestAltitude?.date ?? null,
    bestDay: bestDay?.score ?? 0,
    bestDayDate: bestDay?.date ?? null,
    orbitDays: history.filter((point) => scoreOf(point) >= ORBIT_DAY_SCORE)
      .length,
    windowDays: history.length,
  };
}

export type DayCard = {
  altitude: number;
  date: string;
  headline: string;
  ghost: string;
  metrics: Array<{ label: string; value: string }>;
  streak: number;
  tier: OrbitTier;
};

export function getDayCard({
  date,
  ghost,
  momentum,
  streak,
}: {
  date: string;
  ghost: GhostRace;
  momentum: Momentum;
  streak: StreakState;
}): DayCard {
  return {
    altitude: momentum.projected,
    date,
    ghost: ghost.verdict,
    headline:
      momentum.status === "climbing"
        ? `Climbing to ${momentum.projected}`
        : momentum.status === "decaying"
          ? `Holding at ${momentum.projected}`
          : `Steady at ${momentum.projected}`,
    metrics: [
      { label: "Altitude", value: `${momentum.projected}` },
      { label: "Streak", value: `${streak.streak} d` },
      {
        label: "Today",
        value: momentum.todayScore === null ? "—" : `${momentum.todayScore}%`,
      },
    ],
    streak: streak.streak,
    tier: getOrbitTier(momentum.projected),
  };
}
