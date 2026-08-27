/**
 * What a session actually is, and how to run it.
 *
 * The plan says "Upper body, 60 min", which is what to do and not how to do
 * it. This is the how — one line each for the warm-up, the main block, the
 * finisher and the recovery — written per sport rather than per day, so it
 * cannot drift from a plan it does not read.
 *
 * It lives here rather than in the fitness page because the dashboard shows the
 * main block too: "what am I training today" is a question people ask before
 * they open anything.
 */

import type { SportType } from "@/lib/fitness";

export type TrainingGuidance = {
  finish: string;
  headline: string;
  intent: string;
  main: string;
  recovery: string;
  warmup: string;
};

export function getTrainingGuidance(
  sport: SportType,
  title: string,
): TrainingGuidance {
  if (sport === "tennis") {
    return {
      finish: "10 min serve targets, then 5 min easy shoulder mobility.",
      headline: "Tennis skill and movement",
      intent: "Prioritize footwork, clean contact and repeatable serve mechanics.",
      main: "3 blocks: cross-court rally, approach shots, serve plus first ball.",
      recovery: "Forearm, calves and hips. Keep the next gym day fresh.",
      warmup: "8 min dynamic hips, ankles, shoulder circles and short court sprints.",
    };
  }

  if (sport === "cardio") {
    return {
      finish: "5 min cooldown walk and nasal breathing.",
      headline: "Conditioning base",
      intent: "Build engine without crushing recovery for strength work.",
      main: "30-45 min zone 2, or 8 x 60 sec faster efforts with easy recovery.",
      recovery: "Hydrate, stretch calves lightly and keep evening intensity low.",
      warmup: "Start easy for 8-10 min before raising pace.",
    };
  }

  if (sport === "mobility") {
    return {
      finish: "2 min slow breathing in a deep squat or child pose.",
      headline: "Mobility and control",
      intent: "Open the positions you need for lifting, running and tennis.",
      main: "Hips, thoracic rotation, hamstrings, ankles and shoulder control.",
      recovery: "Keep it smooth. No aggressive stretching today.",
      warmup: "5 min easy movement flow from neck to ankles.",
    };
  }

  if (sport === "rest") {
    return {
      finish: "10 min walk after dinner if you feel stiff.",
      headline: "Recovery day",
      intent: "Absorb the week. Do less, but do it deliberately.",
      main: "Sleep, steps, hydration and light tissue work only.",
      recovery: "Prepare tomorrow's session and keep caffeine earlier.",
      warmup: "No workout warmup needed. Move gently.",
    };
  }

  return {
    finish: "Core finisher: carries, plank or dead bug for 6-8 min.",
    headline: `${title} gym session`,
    intent: "Hit the planned split with clean reps and leave one rep in reserve.",
    main: "Main lift, secondary compound, 2 accessories, then trunk stability.",
    recovery: "Protein meal, light walk and no extra max-effort sets.",
    warmup: "5 min pulse raiser, mobility for today’s joints, then ramp-up sets.",
  };
}
