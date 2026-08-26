# Orbit Brand

Last reviewed: 2026-08-24

## The one line

**Your day has an altitude.**

Everything Orbit says comes back to that: progress is a height you hold, not a
count you can lose in one bad evening.

## Positioning

Orbit is a personal operating system for tasks, training and money, for people
who have already tried the habit apps and stopped opening them. The competitor
is not another dashboard; it is the moment on day four when a broken streak
makes the app feel like an accusation and the icon never gets tapped again.

| | Habit trackers | Orbit |
| --- | --- | --- |
| Progress | A count that resets to zero | An altitude that decays 15 % a day |
| Today's ask | "Don't break the chain" | "Finish today at 49 % to hold Mid orbit" |
| Opponent | Strangers on a leaderboard | The you of exactly one week ago |
| Proof | A screenshot of a number | A rendered day card built on your device |

## Voice

Plain, physical, and specific. Orbit talks like an instrument, not a coach.

- **Say the number.** "Finish today at 49 %" beats "keep up the good work".
- **Never shame.** The mechanic already applies pressure; the copy does not
  need to. No "you failed", no red streak graveyards.
- **Show the maths.** The decay formula is printed on the landing page on
  purpose. Nothing about someone's progress should be a black box.
- **No hype words.** No "revolutionary", "AI-powered", "10x". If a sentence
  would survive being said out loud to a friend, it ships.
- **British-neutral English**, sentence case, serial commas avoided, and
  numerals for anything measurable.

## The mark

A body on a ring: a stroked circle, a brighter arc from twelve o'clock, a solid
core, and a satellite at the top of the ring. It is drawn with the same
geometry as the activity rings inside the product, so the logo is literally a
small version of the interface.

- `OrbitMark` — the glyph alone. Minimum size 24 px; the satellite disappears
  into noise below that.
- `OrbitWordmark` — glyph plus name, gap of `size × 0.09`, name at
  `size × 0.72`, tracking `-0.03em`.
- Accent lime on dark is the default. On a coloured surface use the mono tone
  (white) rather than recolouring the glyph.
- Never rotate, outline, add a gradient to, or place the mark inside another
  shape. It already is a shape.

## Pip

The mark is the system; Pip is the character: a penguin in a helmet, drawn as
one SVG that takes the account's state — so the face on the dashboard is never a
decoration that disagrees with the numbers.

The joke is the point. A penguin is the bird that cannot fly, and Orbit is
about altitude: nothing about a day is impossible, it just needs something
under it. The helmet is the Orbit mark worn — the same ring, the same geometry
— so the brand and the character are one drawing.

| Mood | When |
| --- | --- |
| `asleep` | Nothing today and a decayed orbit — eyes shut, feet down |
| `grounded` | Nothing today, but yesterday still holding it up |
| `lifting` | The day has started |
| `cruising` | The day already counts (50 %+) |
| `soaring` | A full day (80 %+) |
| `sealed` | Every ring closed |

Rules:

- Pip is derived, never chosen. `getPipState` reads the day, the orbit and the
  run, in that order — a finished day beats everything.
- Pip animates when something happened and is still otherwise: the flame
  flickers three times and rests, the hop plays once. Nothing loops forever.
- Minimum size 22 px; below that the helmet swallows the face.
- Feet on the ground mean the engine is off. Pip only burns while leaving.
- Pip never speaks in exclamation marks, never nags, and never asks to be fed.
  The line under Pip states the situation and the next move: "Engine is lit. One
  more thing and the day holds."
- Pip is not a reward and is never withheld. Progress is the reward.
- Pip is drawn once. `src/lib/pip-art.ts` holds the geometry; the interface
  renders it as SVG and the shared images draw it on canvas, so the character on
  a posted card is the same character as the one on the dashboard.
- On the dark share images the shell lifts to `#2B2634`: a black penguin on a
  near-black card is a hole in the image, not a mascot.

## The climb

The one deliberately playful surface: Pip riding a curve out of the corner
while a multiplier counts up, in the visual language people already know from betting apps —
borrowed only for the shape of the feeling.

What keeps it honest, and what must stay true of it:

- The multiplier is real: the orbit now over the orbit yesterday. A day with
  nothing on it lands on ×0.85, because that is exactly what decay does.
- Nothing is wagered, nothing is random, and nothing crashes. The curve stops
  where the day stopped.
- It is never the only place a number appears, and never the thing that decides
  one.

## The day is a launch, not a ring

Three concentric rings belong to Apple. Orbit's day is drawn as an ascent:
columns of thrust, a line where orbit begins, and the day riding at its own
altitude. The rule this follows is worth keeping: **when a form is famous for
belonging to somebody else, it cannot carry your brand** — however well it is
executed, the first thing anyone reads is whose it is.

## Colour

The product palette is the brand palette; there is no separate marketing set.
It is warm on purpose — bone type on a warm near-black reads as paper and
instrument rather than as another cold dashboard.

| Token | Value | Role |
| --- | --- | --- |
| `--canvas` | `#100f0d` | Everything sits on warm near-black |
| `--text-primary` | `#f4ebdd` | Bone. Pure white is never used |
| `--accent-primary` | `#a3e635` | The one action colour, used sparingly |
| `--ring-tasks-to` | `#ff4fa3` | Tasks |
| `--ring-fitness-to` | `#a3e635` | Fitness |
| `--ring-finance-to` | `#60a5fa` | Finance |
| Tier colours | `--danger` → `--accent-highlight` | Momentum tiers, low to high |

Colour never carries meaning alone: every ring, tier and verdict is also
stated in words or numbers.

## Typography

- **Figtree** carries everything the product says. It is humanist rather than
  geometric: the letters have a hand in them, so the interface reads like a
  person wrote it and not like a terminal printed it. Close to the type an
  iPhone sets — familiar enough to disappear — but warmer, which is the whole
  difference between Bloom and a dashboard.
- **Labels are spoken, not stamped.** Eyebrows, figure captions and axis ticks
  are Figtree at 12.5 px, 600, sentence case — `.label-caps`. Tracked mono
  capitals read as a machine printing at you; the same words in the product's
  own face read as a person having written them.
- **DM Mono is for codes**, and only codes: a crew code, an identifier,
  something read out character by character — `.code-caps`.
- Numbers are always tabular (`.metric-value`), so a figure that changes does
  not move the layout under it.
- The landing sets the name at `.display-mega`; the wordmark is the artwork.
- Tracking tightens as type grows and never goes positive above 20 px.
- Two families, and no third. A face added for one screen is a face that has to
  be argued about on every screen after it.

## Form

- Corners are machined: 2 px on controls, 4 px on rows, 6 px on panels. Nothing
  in Orbit is pill-shaped except a dot or a genuine pill.
- Edges are bone hairlines at 9% and 18%. Depth comes from hairlines, a 72 px
  grid that fades before it reaches an edge, and one very soft shadow — never
  from a glowing border or a coloured panel.
- Sections are separated by a full-width hairline, not by cards inside cards.

## Motion

- Rings fill from empty on arrival, outer first, 90 ms apart, critically
  damped. That single animation is the brand's motion signature.
- Nothing loops forever. No perpetual spinning, pulsing, or floating.
- Everything respects `prefers-reduced-motion`; the value is still shown, it
  just arrives without travelling.

## Surfaces

Where the brand shows up outside the app, all of it generated from the same
code that draws the product:

| Surface | Source |
| --- | --- |
| Landing page | `src/app/welcome/page.tsx` |
| Link preview | `src/app/opengraph-image.tsx` |
| Home-screen icon | `public/icon-512.png`, `src/app/manifest.ts` |
| Shareable day card | `src/lib/day-card-canvas.ts` |
| Sample day card | `public/day-card-sample.png` |

## What Orbit will not do

- No feed, no follower count, no public leaderboard.
- No notification that guilts; the only planned one carries the hold score.
- No dark patterns around cancelling, and no charging before the hosted plan
  actually exists.
- No claim about health, calories, or readiness that the data cannot support.
