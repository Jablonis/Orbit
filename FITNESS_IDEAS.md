# Orbit Fitness Guidance — Product Idea

Last reviewed: 2026-07-23

## Product direction

Add an optional **Workout Guidance** layer to Fitness. It should help a user
answer three questions without pretending Orbit is a medical professional or
silently rewriting the user's plan:

1. What am I training today?
2. Which exercises, sets, reps, and rest periods belong in this session?
3. How do I perform or adjust each exercise safely?

The first version should use transparent, coach-authored templates and
user-selected goals. AI-generated workouts should not be the foundation.

## Best daily experience

### 1. Setup

Ask the user to choose:

- Primary goal: general fitness, strength, muscle gain, conditioning, mobility,
  or sport support.
- Experience: beginner, intermediate, or advanced.
- Available days and preferred session length.
- Equipment: bodyweight, dumbbells, bands, full gym, cardio equipment, or
  custom.
- Exercises to avoid and user-declared limitations.

Every choice remains editable. Orbit must never infer an injury, diagnosis, or
medical readiness.

### 2. Today view

The existing planned sport becomes a specific, previewable session:

```text
Full body A · 48 min

Warm-up
5 min easy movement
2 mobility drills

Main work
Goblet squat       3 × 8–10     90 sec
Dumbbell press     3 × 8–10     90 sec
Cable row          3 × 10–12    75 sec

Finish
Farmer carry       3 × 30 sec
```

The card should expose:

- Start workout.
- Estimated duration.
- Exercise count and training focus.
- Equipment needed.
- A clear reason for the session: “Chosen from your three-day general-strength
  template,” not a vague personalized claim.

### 3. Active workout

Use a distraction-free session screen:

- One exercise at a time on phones; compact full list on larger screens.
- Set checkboxes with editable reps, weight, time, distance, or difficulty.
- Rest timer that starts only when requested.
- Previous result shown as context, never as a demand.
- Swap exercise action with a reason and equivalent movement pattern.
- Exercise detail sheet containing setup, movement cues, common mistakes,
  regression, progression, and optional demonstration media.
- Pause, finish early, or add a note without losing completed sets.

### 4. Completion

After the workout:

- Show planned versus completed exercises and duration.
- Ask for optional session difficulty and a short note.
- Save facts first: sets, reps, load, duration, and completion.
- Offer one neutral observation only when supported by data.
- Let the user adjust the next template occurrence; do not silently change it.

## Exercise information model

Each exercise should be a maintained library record:

```ts
type Exercise = {
  id: string;
  name: string;
  movementPattern:
    | "carry"
    | "hinge"
    | "locomotion"
    | "pull"
    | "push"
    | "rotation"
    | "squat";
  equipment: string[];
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  coachingCues: string[];
  commonMistakes: string[];
  regressionIds: string[];
  progressionIds: string[];
  measurement: "distance" | "reps-load" | "reps-only" | "time";
  safetyNote?: string;
  media?: {
    thumbnailUrl: string;
    videoUrl: string;
    source: string;
    reviewedAt: string;
  };
};
```

Keep exercise content versioned and reviewed. Do not let arbitrary generated
text become permanent technique guidance.

## Workout template model

```ts
type WorkoutTemplate = {
  id: string;
  name: string;
  goal: string;
  experience: "beginner" | "intermediate" | "advanced";
  expectedMinutes: number;
  equipment: string[];
  blocks: Array<{
    label: "Warm-up" | "Main work" | "Accessory" | "Finish";
    exercises: Array<{
      exerciseId: string;
      sets: number;
      repRange?: [number, number];
      seconds?: number;
      restSeconds: number;
      effortTarget?: string;
      notes?: string;
    }>;
  }>;
  source: string;
  version: number;
};
```

Store the performed workout as an immutable session snapshot. Editing a
template later must not rewrite historical exercise logs.

## Tips and recommendation rules

### Safe V1: rule-based and explainable

Recommendations may use:

- The goal and equipment explicitly selected by the user.
- Available session time.
- The current template and recently logged results.
- Exercises the user has explicitly hidden or replaced.

Every recommendation should display a reason, for example:

> Dumbbell row is available because your gym profile includes dumbbells and the
> session needs a pull movement.

### Do not implement in V1

- Injury diagnosis or rehabilitation advice.
- Calorie-burn promises.
- Claims that soreness, heart rate, or missed workouts prove readiness.
- Automatic load increases without user confirmation.
- Generated technique advice without a reviewed source.
- Cross-domain claims based on tasks, spending, sleep, or productivity.

## Exercise swapping

A swap should preserve:

- Movement pattern.
- Intended difficulty range.
- Available equipment.
- Approximate session time.

The UI should show what changes:

```text
Swap barbell squat

Goblet squat
Same squat pattern · less setup · dumbbell required

Leg press
Same lower-body focus · machine required
```

The user confirms the swap for this session or for future template sessions.

## Suggested implementation phases

### P0 — Exercise library foundation

- Add reviewed exercise records and movement/equipment taxonomy.
- Add template, block, and template-exercise models.
- Create read-only exercise detail UI.
- Seed a very small, high-quality template set.

### P1 — Structured workout logging

- Add workout-session snapshots and exercise-set logs.
- Build Start, Active, Pause, Finish, and Abandon states.
- Support reps, load, time, distance, rest timer, and notes.
- Show planned versus completed without judgmental scoring.

### P2 — User templates and swaps

- Let users duplicate and edit templates.
- Add exercise search, filters, and movement-preserving swaps.
- Add previous-result context and explicit user-confirmed progression.
- Add import/export for user-created templates.

### P3 — Explainable suggestions

- Suggest a template from explicit goal, schedule, equipment, and experience.
- Show contributing inputs and allow dismissal.
- Require confirmation before changing a plan.
- Add an option to disable every suggestion surface.

## UX and accessibility requirements

- Exercise instructions remain readable without video.
- Demonstration media needs captions and a text equivalent.
- Timers announce completion without relying on sound.
- Set controls use at least 44 × 44 CSS-pixel targets.
- Color never carries completion or difficulty meaning by itself.
- Active workout state survives refresh and temporary connection loss.
- Reduced-motion mode disables decorative transitions.
- Long exercise names and localized instructions work at 320 CSS pixels.

## Success criteria

- A first-time user can understand today's session before starting.
- A user can log one set in two interactions or fewer.
- The reason for every suggested exercise or swap is visible.
- Historical sessions never change when a template is edited.
- The user can complete, shorten, swap, or abandon a workout without losing
  already logged facts.
- No guidance makes medical, diagnostic, or guaranteed-outcome claims.
