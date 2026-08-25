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

- System sans (Geist) for structure; numbers always tabular.
- **Geist Mono for every label**: eyebrows, axis ticks, chapter codes, figure
  captions. Uppercase, 12 px, 0.12em tracking. This is the detail that makes
  Orbit read as an instrument rather than a web page.
- The landing sets the name at `.display-mega` — uppercase, 115% stretch, one
  per page. The wordmark is the artwork; there is no illustration behind it.
- The serif (`.editorial-display`) is reserved for one statement per screen.
- Tracking tightens as type grows and never goes positive above 20 px.

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
