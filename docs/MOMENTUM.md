# Orbit Momentum

Last reviewed: 2026-08-24

Momentum is the layer that makes Orbit worth opening every day. Everything in
it is derived from data the dashboard already computes, so there is no separate
gamification state that can drift away from the truth.

## Why not streaks

A streak is binary: it is either alive or it is zero. One bad week kills it and
the app becomes a reminder of failure, which is exactly when people quit. Orbit
models the day physically instead:

```text
altitude(today) = 0.85 × altitude(yesterday) + 0.15 × score(today)
```

- A sustained daily score converges to that score as altitude.
- A missed day costs 15 % of the altitude instead of everything.
- Nothing is ever fully lost, and nothing holds itself up for free.

`score` is the existing productivity score (tasks, fitness, focus), so the
weights configured in dashboard settings flow straight into momentum.

## Tiers

| Tier | Floor |
| --- | --- |
| Grounded | 0 |
| Liftoff | 20 |
| Low orbit | 40 |
| Mid orbit | 60 |
| Geostationary | 78 |
| Escape velocity | 92 |

The tier is computed from the **settled** altitude, meaning every day before
today. Today is shown separately as the projection, which keeps the number
honest while the day is still open.

## The daily hook

The card answers one question in a number:

```text
hold score = (tier floor − 0.85 × altitude) / 0.15
```

That is the exact score needed today to stay in the current tier — the
difference between "you should probably do something" and "finish today at
64 % or you drop out of Mid orbit". The same formula against the next tier
floor produces the climb target.

## Days in orbit and the aerobrake

A day at or above 50 % counts as a day in orbit. A single missed day is
absorbed as an **aerobrake** if no other miss happened within the previous
seven days, so one bad Tuesday does not erase two months. Today never breaks a
run; it is open until the day ends.

## The ghost

Every week races the same week seven days earlier, compared only over the days
both weeks have actually reached. Competing against a real, personal, already
achieved number beats competing against an arbitrary target — and there is no
social backend to maintain.

## The day card

`DayCardShare` renders a 1080 × 1350 PNG of the current orbit, tier, streak and
ghost verdict entirely on the device, then offers the native share sheet or a
download. Nothing is uploaded; sharing is always an explicit user action.

## The weekly recap

A day is the unit Orbit scores; a week is the unit people talk about. On the
first three days after a week ends, Orbit closes it: how many of the seven days
held orbit, the best day, what the altitude did across the week, and one line
comparing it to the week before. It is shown once as a moment (`WeekSealed`,
remembered per week per device) and then stays available as a dashboard card
until the next week ends.

The recap is derived from the same thirty days of productivity points the
Overview already loads for momentum — there is no recap table, nothing to
regenerate, and nothing that can disagree with the days themselves. `Best week
yet` is only claimed against whole weeks inside that window, and a tie leaves
the record with the earlier week.

`RecapShare` renders the week as a 1080 × 1350 PNG on the device, in the same
way as the day card. Both carry Pip, in the mood the day or the week earned,
and both are set in the product's own two faces — a posted card is recognisably
Orbit before a word of it is read.

## The voyage

Momentum is a decaying number: it says how you are flying today, and takes 15 %
of itself every day nothing happens. That is half of a habit — the pressure —
and on its own it reads as punishment, because there is nothing to keep.

So there is a second number with the opposite job. **Distance** is the sum of
every day Orbit has ever scored, and it never goes down. A day off adds nothing;
it does not take anything back. You cannot un-visit the Moon.

| | Altitude | Distance |
| --- | --- | --- |
| Says | How you are flying now | How far you have come |
| Moves | Up and down | Only up |
| Job | The pressure | The reward |

Ten places sit along it, from the pad to the heliopause. The map is paced for a
human year rather than drawn to scale — a real Mars transfer would take a
lifetime of perfect days, and a ladder nobody can climb is not a ladder — but
the names and the facts are real.

Everything is derived from the same daily scores, including **the date each
place was reached**, which falls out of walking the days in order. The card
counts down to the next place at the last seven days' pace, because "the Moon in
38 days" moves people and "distance 4 200" does not. Arriving is a moment, shown
once, ever: a day and a week come round again, a place does not.

## Where the code lives

| Concern | File |
| --- | --- |
| Engine (pure, unit tested) | `src/lib/momentum.ts` |
| Weekly recap (pure, unit tested) | `src/lib/recap.ts` |
| The voyage (pure, unit tested) | `src/lib/voyage.ts` |
| Share image renderers | `src/lib/day-card-canvas.ts`, `src/lib/recap-canvas.ts` |
| Pip: geometry, then two renderers | `src/lib/pip-art.ts`, `src/components/brand/Pip.tsx`, `src/lib/pip-canvas.ts` |
| Share plumbing (render, share sheet, download) | `src/lib/share-image.ts` |
| Ring geometry (pure, unit tested) | `src/lib/activity-rings.ts` |
| Daily rings | `src/components/ActivityRings.tsx` |
| Orbit visual | `src/components/MomentumOrbit.tsx` |
| Share controls | `src/components/DayCardShare.tsx`, `src/components/RecapShare.tsx` |
| The week closing | `src/components/WeekSealed.tsx` |
| Arriving somewhere | `src/components/Arrival.tsx`, `src/components/overview/VoyageCard.tsx` |
| Overview card | `MomentumCard` in `src/app/page.tsx` |
| Tests | `tests/momentum.test.ts`, `tests/voyage.test.ts`, `tests/recap.test.ts`, `tests/day-card.test.ts`, `tests/activity-rings.test.ts` |

## The visual language

Both surfaces share one idiom, borrowed from Apple Fitness because it is the
clearest way to show "how much of today is done" at a glance:

- One thick ring per area, starting at twelve o'clock and sweeping clockwise,
  with a rounded head and the ring's own colour at low opacity as its track.
- Each ring fills from empty on every visit, outer ring first, 90 ms apart, on
  a critically damped curve — no bounce, nothing that loops forever.
- Past the goal the ring keeps sweeping over itself, and the head gets a shadow
  so the overlap reads as depth.
- Momentum uses the same ring for altitude, marks the tier floor across it, and
  keeps the last fourteen days as a dial around the outside.

Colour carries no meaning on its own: every ring is also stated as a number and
a percentage in the legend.

## Deliberately not built yet

- Persisted all-time records. Everything is currently derived from the loaded
  60-day window and labelled as such.
- Push or scheduled reminders. They need a service worker plus a stored
  subscription, and they are the natural next step now that Orbit installs as a
  PWA.
- Anything that shows another person's numbers. The ghost is the only opponent.

## Next steps

1. Persist a `momentum_records` row (peak altitude, longest run) so records
   survive beyond the query window.
2. Add a service worker and one opt-in evening notification carrying the hold
   score: the single message that makes the app impossible to forget.
3. Add a season view: 90 days of altitude as one continuous chart with tier
   bands.
4. Let the day card be themed by tier, and add a compact 1200 × 630 variant.
