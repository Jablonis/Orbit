# Orbit UI System

Orbit is drawn as an instrument: warm bone type on a warm near-black canvas,
hairline edges instead of heavy panels, machined corners, and technical mono
labels. Colour appears only as small tinted areas — a ring, an eyebrow, a
single action button — and never as a large fill or a gradient across a panel.

This document defines the reusable UI contract for Orbit. It complements the
product roadmap in the local-only `design.md`; it is intentionally tracked with
the code so new routes inherit the same rules.

## Visual hierarchy

Orbit uses four surface roles:

| Role | Class / primitive | Use |
| --- | --- | --- |
| Hero | `surface-hero`, `<Surface tone="hero">` | One route-level state or decision |
| Primary | `surface-primary`, `<Surface>` | Main working content and evidence |
| Secondary | `surface-secondary`, `<Surface tone="secondary">` | Rows and inset detail |
| Overlay | `surface-overlay`, `<Surface tone="overlay">` | Dialogs and command surfaces |

Legacy `hero-panel`, `content-panel`, `glass-panel`, `floating-panel`, and
`glass-modal` remain supported while routes are migrated. New work must use
semantic surface roles. Blur is reserved for overlays and navigation.

## Component inventory

| Component | Canonical implementation | Required states |
| --- | --- | --- |
| Page shell | `.app-shell`, `.page-container` | phone, tablet, laptop, wide |
| Page header | `<PageHeader>` | long title, optional action |
| Surface | `<Surface>` | hero, primary, secondary, overlay |
| Button/link | `<Button>`, `<ButtonLink>` | default, hover, focus, active, disabled, pending |
| Icon action | `<IconButton>` | 44 px target, accessible name |
| Field | `<Field>`, `<Input>`, `<Select>`, `<Textarea>` | default, focus, disabled, invalid, guidance |
| Segmented control | `<SegmentedControl>` | current item, keyboard links, wrapping |
| Filter chip | `<FilterChip>` | pressed and unpressed |
| Badge | `<Badge>` | text label plus optional icon |
| Metric | `<Metric>` | value, unit/context, missing value |
| List row | `<ListRow>` | long content, action, dense data |
| Data table | `<TableShell>`, `.ui-table` | sticky header, exact values, narrow scroller |
| Empty state | `<EmptyState>` | explanation, next valid action |
| Feedback | `<InlineFeedback>`, `<ActionToast>` | info, success, error, retry/undo |
| Dialog | native `<dialog>`, `<ConfirmDialog>` | named, modal, Escape, backdrop, restore focus |
| Skeleton | `<Skeleton>`, `<RouteLoading>` | geometry-matched, reduced motion |

The protected `/ui-lab` route renders the canonical primitives and long-content
examples. It is not part of primary navigation.

`ui-quality.config.json` is the machine-readable route, viewport, zoom, data
state, interaction-state, and performance-budget matrix. Visual automation
should consume that file once an authenticated screenshot baseline is approved.

## Light and dark

Every colour is a named token, so a second theme is the same names with
different values — but two rules only apply at night:

- **A tint is a dark tinted surface, and its ink comes up to meet it.** The
  light theme's `--tasks-tint` is a pale pink under `--tasks-ink` at near-black;
  the dark one is a deep pink-brown under a pink that is nearly pastel. A tint
  that merely darkens, with the same ink on it, is a muddy card.
- **Pip owns his own two colours.** He is a black-and-white bird: reading his
  body from `--foreground` and his belly from `--card` inverted him into a photo
  negative the moment the canvas went dark. `--pip-ink` and `--pip-paper` stay
  the way round he is drawn, and only lift off pure black so he is not a hole in
  a dark card.

The choice lives in a cookie and the server stamps `data-theme` on the document,
so the first paint is already right. No stamp means "follow the system", which
the stylesheet answers with `prefers-color-scheme`. The local-storage version of
this needs an inline script to beat the paint, and an inline script here needs a
CSP nonce — a lot of machinery to avoid one white flash.

Two washes from v1 survived as raw `rgba(244,235,221,…)` in sixty-odd places —
bone at low alpha, invisible on paper and wrong at night. They are `--wash` and
`--hairline` now, and `--shadow-card` / `--shadow-pop` answer the same way.

## Semantic tokens

Tokens live in `src/app/globals.css`. Nothing in the product may introduce a
raw hex value for a meaning that already has a token.

### Palette

| Token | Value | Role |
| --- | --- | --- |
| `--canvas` | `#100f0d` | Warm near-black behind everything |
| `--surface-1` … `--surface-selected` | `#171410` → `#2a241c` | Five warm steps of separation |
| `--text-primary` | `#f4ebdd` | Bone. Never pure white |
| `--text-secondary` / `--text-tertiary` / `--text-muted` | `#c3b9ab` / `#9a9086` / `#7c736a` | Warm greys, in that order of quiet |
| `--border-subtle` / `--border-strong` | bone at 9% / 18% | Every edge is a bone hairline |
| `--grid-line` | bone at 3.5% | The 72 px instrument grid |
| `--accent-primary` | `#a3e635` | The single action colour |
| `--accent-highlight` / `--accent-info` / `--accent-focus` | `#ff4fa3` / `#60a5fa` / `#8b7bd8` | Tasks / finance / review |
| `--ring-*-from` / `--ring-*-to` | per domain | Ring gradients, dark to bright along the sweep |

### Geometry

Corners are machined, not soft: `--radius-control` 2 px, `--radius-row` 4 px,
`--radius-panel` 6 px, `--radius-overlay` 8 px. Pills and dots stay at 999 px.
`--control-height` is 44 px and is a floor, not a suggestion.

### Other roles

- Status: `--success`, `--warning`, `--danger`, `--accent-info`.
- Data: `--data-series-1` through `--data-series-5`.
- Motion: `--ease-orbit`, `--ease-ring`, `--duration-micro`, `--duration-state`.
- Elevation: `--shadow-panel`, `--shadow-overlay` — wide, soft, and heavily
  negative-spread. Depth comes from hairlines first, shadow second.

## The day: the ascent

The day is drawn as a launch, not as rings. Three columns of thrust — tasks,
fitness, finance — rise from a pad; a dashed line crosses the frame at
`ORBIT_DAY_SCORE`, the score above which a day counted; the day's own score
rides in a lane at the right and crosses that line when it does.

Concentric rings are Apple's idea and read as borrowed however well they are
drawn. Orbit's mechanic is altitude, not laps, and it has a real threshold — so
the picture is a height with a line in it. It is also wide rather than square,
which is the shape a phone has to spare.

`src/lib/ascent.ts` holds the geometry and the words; `DayAscent` draws it, in
a full form with labels and Pip, and a compact one at badge size.

## Typography

Figtree for everything the product says, including labels. DM Mono is kept for
the few things that genuinely are codes. Both are loaded through `next/font`,
so they are self-hosted and there is no third-party request on a page view.

| Role | Current class | Standard |
| --- | --- | --- |
| Page title | `.page-title` | 32–40 px, 600 |
| Card title | `.card-title` | 18–20 px, 600 |
| Body | `.body-copy` | 14 px / 24 px |
| Metadata | `.metadata-copy` | 12 px / 18 px minimum |
| Section label | `.label-caps` | Figtree, 12.5 px, 600, sentence case — a label is spoken, not stamped |
| Code | `.code-caps` | DM Mono, 12 px, 0.08em, uppercase — crew codes and identifiers only |
| Numeric datum | `.metric-value` | tabular figures |
| Editorial statement | `.editorial-display` | Brief and reflection only |
| Landing wordmark | `.display-mega` | Uppercase, 115% stretch, one per page |

Essential content must never render below 12 px. Instructions, errors, and
actionable labels should normally be 13–14 px.

## Interaction contract

- Frequent and consequential controls use a 44 × 44 px minimum target.
- Icon-only controls require an accessible name.
- Focus uses the global semantic focus token and must never be clipped.
- Dialogs use native `<dialog>` with a programmatic title, modal focus
  containment, Escape handling, backdrop dismissal when safe, and focus return.
- Destructive changes support undo or a confirmation when recovery is
  impossible.
- Optimistic actions expose busy, saved, failure, retry, and undo states.
- Important information is never hover-only or color-only.
- **If it looks like a control, it is one.** A tile with a big number, a row
  with a chevron's worth of affordance, a dot with a tooltip: anything drawn
  like something you can press must do something when pressed, and reach that
  something by keyboard too. Where the thing genuinely cannot act — an imported
  record Orbit is not allowed to change — it is drawn as a record and says so,
  rather than being drawn as a button that ignores you.
- A tooltip is not an interaction. `title` never carries anything a phone needs;
  if a mark has something to say, tapping it says it.

## Responsive contract

| Width | Intent |
| --- | --- |
| 320 px | Reflow floor; no page-level horizontal scrolling |
| 375 / 430 px | Primary phone layouts and safe-area behavior |
| 768 px | Navigation rail and tablet density |
| 1024 px | Compact laptop/tablet landscape |
| 1440 px | Maximum dashboard density; content remains bounded |

Use `100dvh` for full-height mobile overlays, safe-area insets for fixed
navigation, and an internal labeled scroller for genuinely two-dimensional
tables. Primary status and action should remain in the first phone viewport.

## Content limits

- Titles wrap by default. Truncation is allowed only when the full value is
  available in the same workflow.
- Task and transaction notes use a deliberate clamp plus an expansion path.
- Currency values use tabular figures and do not wrap.
- Empty states name what is missing and the next valid action.
- Loading skeletons approximate final geometry to avoid layout shift.
- Dates, currency, and time use the user-facing locale rules for the route.

## Release review

Run:

```text
npm run lint
npx tsc --noEmit
npm test
npm run build
```

Then verify authenticated empty, typical, dense, error, stale, and long-content
states at 320, 375, 430, 768, 1024, and 1440 px, plus 200% zoom. Record keyboard,
VoiceOver, NVDA, reduced-motion, forced-colors, slow-network, and on-screen
keyboard results. Automated checks complement rather than replace the manual
review.
