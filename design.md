# Orbit Design Recommendations

Last reviewed: 2026-07-17

This document is Orbit's design direction and inspiration library. It recommends
changes; it does not mean those changes are already implemented. Keep the
product's existing identity: a calm dark interface, subtle glass, restrained
gradients, rounded geometry, Geist typography, and lime, blue, pink, and violet
accents.

## Design north star

Orbit should feel like a quiet morning control room: within five seconds, the
user should understand how the day is going, what deserves attention next, and
the fastest action they can take.

Three principles should guide future design work:

1. **One clear priority.** The Overview should lead with today's most useful
   decision, not a collection of equally important cards.
2. **Progressive detail.** Show the answer first, supporting context second, and
   full data only when requested.
3. **Color carries meaning.** Decorative gradients can establish atmosphere,
   but status colors must stay predictable across every route.

## What already works and should stay

- The dark background and restrained colored glow make Orbit recognizable.
- Daily Rings give the dashboard a memorable visual anchor.
- Large rounded panels feel friendly rather than enterprise-heavy.
- The narrow desktop rail leaves useful room for the dashboard.
- Geist and compact uppercase labels fit the command-center character.
- Quick Add and dashboard customization support fast, personal workflows.
- The current ring and modal motion is brief and respects reduced-motion
  preferences.

## Recommended priority order

### Priority 1 — Make Overview decisive

Replace the feeling of several equal cards with a clear three-level hierarchy:

1. **Now:** a single wide hero that combines the morning check-in, next task,
   today's workout, and the most important alert.
2. **Today:** Daily Rings and a compact action queue.
3. **Trends:** productivity, cashflow, and weekly review below the fold.

The hero should change its message during the day:

- Morning: “Good morning — plan the day” with check-in and first task.
- Midday: “Keep momentum” with the next unfinished task.
- Evening: “Close the day” with remaining work and reflection.

Use one strong primary action per state. Secondary actions should be quiet text
or icon buttons. This follows Oura's recent “one big thing” approach without
copying its visual language.

Suggested desktop composition:

```text
┌─────────────────────────────── Now / morning check-in ───────────────────────────────┐
│ Good morning                      Next task                     [Start / Check in]     │
│ One sentence of useful guidance   Workout · finance note                              │
└───────────────────────────────────────────────────────────────────────────────────────┘
┌──────────── Daily Rings ────────────┐  ┌──────────── Today's queue ───────────────────┐
│ progress + short interpretation     │  │ up to 4 actionable rows                     │
└─────────────────────────────────────┘  └───────────────────────────────────────────────┘
┌──────── Productivity ───────────────┐  ┌──────── Cashflow ────────────────────────────┐
└─────────────────────────────────────┘  └───────────────────────────────────────────────┘
```

On mobile, keep the same order in a single column. Do not place analytical
charts above the next actionable item.

### Priority 2 — Reduce “glass everywhere”

The current `glass-panel` treatment appears on most content, so depth levels can
feel similar. Use three deliberate surface levels:

| Level | Use | Suggested treatment |
| --- | --- | --- |
| Canvas | Page background | Near-black with one or two very soft ambient glows |
| Content | Normal cards and lists | Mostly opaque dark surface, subtle 1 px border, little or no blur |
| Floating | Navigation, Quick Add, dialogs | Stronger blur, brighter border, deeper shadow |

Keep glass for functional layers that float above content. Use calmer, more
opaque cards for charts and lists. Apple recommends using material to establish
hierarchy and using highly translucent effects sparingly; that principle maps
well to Orbit's existing style.

Recommended starting tokens:

```text
canvas              #0D0D0E
surface-1           #151516
surface-2           #1C1C1E
surface-hover       #242426
border-subtle       rgba(255,255,255,0.08)
border-strong       rgba(255,255,255,0.14)
text-primary        #F7F7F5
text-secondary      #C4C7C8
text-tertiary       #9EA2A4
accent-primary      #A3E635
accent-info         #60A5FA
accent-highlight    #FF4FA3
accent-focus        #A78BFA
danger              #FF8A80
```

Convert repeated literal colors and radii into CSS variables before a broad
visual refresh. That will make contrast and consistency fixes much safer.

### Priority 3 — Clarify color roles

- Lime: primary progress, successful completion, and the main action.
- Blue: scheduling, informational data, and focus time.
- Pink: emphasis or notable insight; do not also use it for destructive errors.
- Violet: atmosphere and personalization, not operational status.
- Red/coral: destructive actions and errors only.
- White: selected navigation and neutral primary buttons.

Never communicate status with color alone. Pair it with a label, icon, pattern,
or numeric value. Avoid placing four accent colors at equal intensity inside one
card; the user should immediately know which value leads.

### Priority 4 — Improve navigation and Quick Add

Desktop navigation can keep the compact rail, but selected items should use a
slim accent indicator plus a quieter surface instead of a full white tile. This
reduces the strongest contrast from appearing in navigation rather than content.

On mobile:

- Keep four main destinations: Overview, Tasks, Fitness, Finance.
- Move Logout and dashboard preferences into a profile/settings sheet.
- Give the active tab an icon fill or small indicator instead of a large white
  rectangle.
- Keep labels visible; icons alone are less scannable for mixed domains.

Turn desktop Quick Add into a small command palette inspired by Raycast:

- Searchable actions rather than only three fixed links.
- Recent actions first, then grouped actions for Tasks, Fitness, and Finance.
- Clear shortcut hints and arrow-key navigation.
- Keep the existing bottom sheet pattern on phones.
- After choosing an action, open the smallest useful form instead of always
  navigating to a full page.

### Priority 5 — Give every route a distinct job

#### Overview

- Lead with the time-aware “Now” hero.
- Add one short interpretation beside Daily Rings, such as “2 of 3 areas on
  track,” rather than requiring the user to interpret all arcs.
- Keep the center score but use the surrounding labels as clickable details.
- Limit the visible action queue to three or four rows; link to the full route.
- Put customization behind a settings icon instead of an always-visible panel.

#### Tasks

Borrow Things' focus on today's work and quiet metadata:

- Make the task title the strongest row element.
- Keep date, estimate, category, and difficulty on one muted metadata line.
- Show actions on hover/focus on desktop; keep one completion control visible.
- Separate “Today,” “Overdue,” and “Upcoming” with clear section headings.
- Let completed rows collapse into a small “Completed today” section.
- Use a brief completion motion: check draws, row softens, then moves to the
  completed section. Do not make the row instantly disappear.
- On mobile, open create/edit as a bottom sheet instead of permanently dedicating
  the first screenful to the form.

#### Fitness

Borrow Oura's daily-focus hierarchy:

- Put today's planned workout first with one obvious “Log session” action.
- Show a seven-day strip beneath it with completed, today, planned, and rest
  states that remain understandable without color.
- Translate the ring score into a sentence: “Workout logged — recovery day
  tomorrow” or “30 minutes planned today.”
- Keep detailed history and plan editing in expandable sections.
- Celebrate completion with a small ring sweep and haptic-like visual pulse, not
  confetti.

#### Finance

Borrow Copilot Money's answer-first dashboard structure:

- Lead with the current-period answer: net cashflow, remaining budget, or the
  pinned finance metric.
- Place income, expense, and net together so the relationship is immediate.
- Add previous-period comparison beside the total, not in a separate card.
- Allow chart hover/tap to reveal exact values and the contributing transactions.
- Use a target or expected-spend line when enough budgeting data exists.
- Keep CSV tools and destructive maintenance actions under a Utilities section,
  away from the primary financial story.

### Priority 6 — Tighten typography and spacing

Use a smaller, repeatable type system instead of many nearby custom sizes:

| Role | Recommendation |
| --- | --- |
| Page title | 40/44 desktop, 32/38 mobile, semibold |
| Card metric | 28/34 or 32/38, semibold |
| Card title | 18/24 or 20/26, semibold |
| Body | 14/21, regular |
| Metadata | 12/18, medium |
| Caps label | 11/16, bold, 0.06 em tracking |

- Keep small labels at 11 px only when they are nonessential and high contrast.
- Use tabular numerals for money, durations, and chart values.
- Reduce uppercase labels where normal sentence case scans faster.
- Use an 8 px spacing base with common card padding of 20 or 24 px.
- Keep card radii to three values: 12 px controls, 18 px rows, 24 px panels.

### Priority 7 — Make charts answer a question

Every chart should have a plain-language takeaway above it:

- “Productivity is up 12% from the previous 7 days.”
- “Spending is €180 below last month at this point.”
- “Tuesday is your most consistent workout day.”

Then provide:

- A visible selected range.
- Exact hover, keyboard, or tap values.
- Comparison or target only when it helps a decision.
- A stable legend with color plus text/symbol differentiation.
- The existing accessible data table as a secondary disclosure.

Avoid decorative charts that repeat a metric already shown in large type. Apple
recommends highlighting only a few useful pieces of information and expanding
the interaction target to the plot area when individual marks are small.

### Priority 8 — Standardize feedback and motion

Define a small motion system:

| Motion | Duration | Use |
| --- | --- | --- |
| Micro | 120–180 ms | Hover, press, active navigation |
| State | 220–320 ms | Row completion, expand/collapse, toast |
| Emphasis | 500–700 ms | Daily Ring progress only |

Recommended easing for state changes: `cubic-bezier(0.22, 1, 0.36, 1)`.

- Animate properties that explain a state change: opacity, transform, progress,
  and height when necessary.
- Avoid continuous glow or background motion.
- Preserve the current reduced-motion behavior.
- Add one consistent toast position and visual style for save, failure, and undo.
- Keep inline messages for errors that the user must resolve in a specific field.

### Priority 9 — Complete empty, loading, and first-use states

Each empty state should answer three things: what belongs here, why it is useful,
and the next action.

Examples:

- Tasks: “Your day is clear” plus “Add a task.”
- Fitness: “No workout planned today” plus “Plan the week.”
- Finance: “No transactions this period” plus “Import CSV.”
- Trends: “Complete a few days to unlock comparisons.”

Keep skeletons shaped like the final content and avoid showing a large spinner
over the whole page. When only one card refreshes, keep the rest of the dashboard
stable.

## Inspiration library

These references are for principles and interaction patterns, not for copying a
brand or recreating a screen pixel-for-pixel.

| Reference | Direct URL | What Orbit should study | What Orbit should avoid |
| --- | --- | --- | --- |
| Oura app redesign | [ouraring.com/blog/new-app-design](https://ouraring.com/blog/new-app-design/) | One important daily insight, time-aware Today view, health detail behind a clear top-level score | Nature imagery and wellness-specific visual language |
| Copilot Money dashboard | [help.copilot.money/dashboard-tab-overview](https://help.copilot.money/en/articles/6045480-dashboard-tab-overview) | A useful answer before charts, period comparisons, drill-down from overview to transactions | Making every finance module compete for attention |
| Copilot Money cashflow | [help.copilot.money/cash-flow-tab-overview](https://help.copilot.money/en/articles/9682232-cash-flow-tab-overview) | Income/spend/net relationship and interactive period detail | Finance-specific complexity on Orbit's main Overview |
| Things 3 | [culturedcode.com/things](https://culturedcode.com/things/) | Calm task hierarchy, low-noise metadata, focus on Today | Copying its bright Apple aesthetic into Orbit |
| Notion Calendar | [notion.com/product/calendar](https://www.notion.com/product/calendar) | At-a-glance scheduling, shortcuts, direct manipulation | Turning Orbit into a full calendar product before core daily flow is excellent |
| Raycast Quicklinks | [manual.raycast.com/quicklinks](https://manual.raycast.com/quicklinks) | Searchable command palette, keyboard navigation, recent actions | Making simple actions require command syntax |
| Linear | [linear.app](https://linear.app/) | Dense but readable lists, strong keyboard flow, restrained surfaces | Enterprise issue-tracker terminology and excessive density on mobile |
| Apple materials guidance | [developer.apple.com/design/human-interface-guidelines/materials](https://developer.apple.com/design/human-interface-guidelines/materials) | Use translucency to express functional layering; keep content surfaces calmer | Applying glass to every content layer |
| Apple chart guidance | [developer.apple.com/design/human-interface-guidelines/charts](https://developer.apple.com/design/human-interface-guidelines/charts) | Clear takeaways, large interaction areas, accessible values | Charts that depend on tiny hover targets or color alone |
| Apple Dark Mode guidance | [developer.apple.com/design/human-interface-guidelines/dark-mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode) | Base/elevated surfaces and strong small-text contrast | Pure black/white everywhere or low-contrast muted labels |
| Dark dashboard Pinterest board | [pinterest.com/taymarvin/dark-dash-ui](https://www.pinterest.com/taymarvin/dark-dash-ui/) | Moodboard for dark surface hierarchy, card rhythm, and chart treatments | Selecting visuals only because they look futuristic |
| Dark finance Pinterest example | [pinterest.com/pin/335236766018562847](https://www.pinterest.com/pin/335236766018562847/) | Finance card composition and dark chart contrast | Copying unverified controls or data patterns from a concept mockup |

## Recommended first design sprint

The best next visual change is a focused Overview refinement, not a complete
reskin:

1. [x] Introduce semantic color, surface, radius, spacing, and type tokens.
2. [x] Design and implement the time-aware “Now” hero.
3. [x] Reorder Overview into Now, Today, then Trends.
4. [x] Reduce glass on normal content cards while preserving it on navigation and
   floating layers.
5. [x] Move dashboard customization and Logout into a profile/settings surface.
6. [ ] Visually test at 320, 375, 430, 768, 1024, and 1440 px. The responsive
   implementation is in place, but an attached browser is still required for
   screenshot verification.
7. [ ] Finish the complete accessibility pass before considering the sprint fully
   verified.
   - [x] Source-level keyboard order and semantic-control review.
   - [x] Reduced-motion behavior retained.
   - [x] Semantic text and accent tokens meet WCAG contrast on their intended
     content surfaces.
   - [ ] Visually verify the authenticated dashboard at 200% zoom in a browser.

## Design review checklist

Before shipping a substantial UI change, verify:

- [ ] The most important action is visually obvious within five seconds.
- [ ] There is only one primary button in each local decision area.
- [ ] Color meanings match the roles defined in this document.
- [ ] Text, controls, and charts remain understandable without color.
- [ ] Small text meets at least 4.5:1 contrast; aim for 7:1 where practical.
- [ ] Interactive targets are at least 44 by 44 px on touch screens.
- [ ] Keyboard focus is visible and follows the visual order.
- [ ] Motion explains a state change and reduced motion remains supported.
- [ ] Loading does not cause avoidable layout jumps.
- [ ] Empty, success, error, pending, and disabled states are designed.
- [ ] The interface works at the six target widths listed above.
- [ ] Realistic long task titles, currency values, dates, and translations fit.
