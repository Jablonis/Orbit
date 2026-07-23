# Orbit UI System

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

## Semantic tokens

Tokens live in `src/app/globals.css`.

- Canvas and surfaces: `--canvas`, `--surface-*`, `--surface-overlay`,
  `--surface-scrim`.
- Borders: `--border-subtle`, `--border-strong`, `--border-focus`.
- Text: `--text-primary`, `--text-secondary`, `--text-tertiary`,
  `--text-inverse`.
- Status: `--success`, `--warning`, `--danger`, `--accent-info`.
- Data: `--data-series-1` through `--data-series-5`.
- Geometry: `--radius-*`, `--control-height`, `--space-card`.
- Motion: `--ease-orbit`, `--duration-micro`, `--duration-state`.
- Elevation: `--shadow-panel`, `--shadow-overlay`.

New components must use a semantic role instead of introducing another hex
value for an existing meaning.

## Typography

| Role | Current class | Standard |
| --- | --- | --- |
| Page title | `.page-title` | 32–40 px, 600 |
| Card title | `.card-title` | 18–20 px, 600 |
| Body | `.body-copy` | 14 px / 24 px |
| Metadata | `.metadata-copy` | 12 px / 18 px minimum |
| Uppercase label | `.label-caps` | 12 px / 18 px, short secondary labels only |
| Numeric datum | `.metric-value` | tabular figures |
| Editorial statement | `.editorial-display` | Brief/reflection only |

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
