# Orbit Project Memory

Last updated: 2026-07-17

This is the maintained technical memory for Orbit. Read it before substantial
work and update it whenever a major feature, schema, architecture, or operating
workflow changes. Keep secrets and personal user data out of this document.

## Product and stack

Orbit is a personal operating-system dashboard joining tasks, fitness, finance,
daily progress, productivity history, and weekly reflection.

- Next.js 16.2 App Router, React 19.2, strict TypeScript, Tailwind CSS 4.
- Supabase Auth and Postgres accessed through `@supabase/ssr` and
  `@supabase/supabase-js`.
- Server Components fetch authenticated data. Client Components are limited to
  interactive islands such as forms, confirmation dialogs, Quick Add,
  customization, and ring animation.
- The visual system is a dark glass interface with white surfaces and lime,
  pink, blue, and violet accents. Preserve its radii, restrained gradients,
  typography, and muted-border treatment.

## Routes

- `/` — authenticated Overview command center.
- `/tasks` — task creation, editing, completion, rollover, archive, and undo.
- `/fitness` — reusable weekly plan plus dated training-session logs.
- `/finance` — transaction summaries, CSV import/export, archive, and undo.
- `/login` — login and sign-up.
- `/auth/logout` — POST logout endpoint.
- `src/proxy.ts` protects authenticated routes and redirects signed-out users.

## Overview behavior

- The Today command strip shows the next task, today's workout, pending finance,
  and a keyboard-accessible Quick Add menu (`Cmd/Ctrl + K`).
- Quick Add must escape the strip's stacking context and remain inside the mobile
  viewport.
- Daily Rings use the `Europe/Bratislava` calendar day. Task progress includes
  today plus overdue rollover tasks, fitness is today's planned session, and
  finance is today's cleared entries. Ring strokes animate for 700 ms after data
  changes and respect `prefers-reduced-motion`.
- Productivity supports user-selected 7-day or 30-day current/previous ranges.
  The weighted score is tasks 60%, fitness 25%, and focus minutes 15%, normalized
  across enabled domains.
- Weekly review stays calendar-week based even when Overview analytics uses the
  30-day preference.
- Dashboard preferences are stored in `profiles.dashboard_preferences`: card
  order, hidden cards, density, analytics range, pinned task category, and pinned
  finance metric.
- Navigation is server-rendered, has no fake notification state, and derives the
  displayed initial from the authenticated email.
- Overview, Tasks, Fitness, and Finance have streaming skeletons and friendly
  retryable route error boundaries.
- On phones, Quick Add is a bottom sheet above the safe-area-aware navigation;
  on larger screens it remains a compact anchored menu.
- Frequent task and fitness submissions expose pending labels and disable their
  submit control through `useFormStatus`. Confirmation dialogs manage their own
  pending and error state.
- Global focus-visible treatment uses the lime accent. Global reduced-motion CSS
  collapses animations and transitions for users who request it.
- Cashflow and productivity charts include numeric HTML table summaries, not
  only visual SVG/bar representations.

## Task behavior

- Completed tasks store immutable transitions in `task_completions` and a current
  `tasks.completed_at` value.
- Completed tasks remain visible only on their completion day. Unfinished tasks
  roll forward; future scheduled tasks remain separate.
- Destructive task actions archive instead of deleting and offer immediate undo.
- Reads explicitly filter by `user_id`; RLS remains the security boundary.

## Fitness behavior

- `fitness_plan_days` is the reusable weekday plan.
- `fitness_sessions` stores dated historical results; changing the plan does not
  destroy history.
- The plan is initialized atomically with an upsert. Server Actions validate
  weekday, sport, quality, duration, and ownership context.
- Resetting the plan is confirmed and does not delete historical sessions.

## Finance behavior

- `finance_transactions` supports active and archived rows. Clearing finance
  requires a confirmation phrase, archives active rows, and supports undo.
- Paid transactions drive balance and summary values. Daily ring calculation is
  date-scoped independently from broader finance summaries.
- CSV parsing validates input and reports friendly row errors.

## Database and security

- User-data tables: `profiles`, `tasks`, `task_completions`,
  `fitness_plan_days`, `fitness_sessions`, `finance_transactions`, and
  `weekly_reflections`.
- All exposed user tables have RLS enabled and owner policies using
  `(select auth.uid())`. Application reads also filter by the authenticated user.
- Database constraints bound enum-like fields, durations, and text lengths.
- Live schema migrations are mirrored in `supabase/migrations`; keep local
  filenames aligned to the applied migration version.
- The known account-level advisor warning is Supabase leaked-password protection
  being disabled. It is not an application schema defect.

## Working rules

- Read the relevant local Next.js 16 guide under `node_modules/next/dist/docs/`
  before editing Next.js code.
- Use the Supabase workflow for any database/auth change: check current docs,
  create a migration with the CLI, apply it, verify with a query, then run
  advisors and logs.
- Preserve unrelated working-tree changes. Use `apply_patch` for source edits.
- Never put secrets, tokens, passwords, private finance data, or personal records
  in source, logs, tests, or this memory file.
- `IDEAS.md` is a local-only roadmap: it is ignored and intentionally removed
  from Git tracking. Keep it locally, mark verified work with `[x]`, and do not
  re-add it to Git.

## Verification baseline

Run proportionate checks after changes:

```text
npm run lint
npx tsc --noEmit
npm run build
```

For UI work, also start the dev server and perform browser verification when a
browser is available. If no browser is attached, report that limitation and use
HTTP route checks plus server/Supabase logs. For schema work, verify the live
result and run Supabase security and performance advisors.

## Major change log

- 2026-07-16 — Added immutable task completion history, dated fitness sessions,
  safe archive/undo flows, accurate productivity comparison, daily command strip,
  Quick Tasks filters, and weekly review/reflection.
- 2026-07-17 — Fixed post-login server errors and Quick Add clipping; made Daily
  Rings date-scoped; added animated rings; added profile-synced dashboard layout,
  density, range, and pinning preferences; removed placeholder notification UI.
- 2026-07-17 — Added persistent project memory, made the product roadmap
  local-only, and completed the first P2 polish batch: route loading/error UI,
  mutation pending feedback, mobile Quick Add sheet, keyboard focus treatment,
  reduced-motion coverage, safe-area spacing, and accessible chart tables.
