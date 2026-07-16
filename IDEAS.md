# Orbit Product and Quality Roadmap

Last reviewed: 2026-07-16

This document is a source-level audit of the current Orbit dashboard. It focuses on ideas that fit the product that already exists: a personal operating system for tasks, fitness, and finance. The order below is intentional—data correctness and safety should come before adding more visual cards.

## Review snapshot

What is already strong:

- The app uses a current Next.js 16 App Router stack with React 19 and TypeScript strict mode.
- User-specific reads happen in Server Components, while interactive forms are isolated in Client Components.
- Server Actions authenticate again before mutations and ownership filters are present on destructive task/finance actions.
- Supabase RLS is enabled on every exposed table. Owner policies use `TO authenticated`, `(select auth.uid())`, and both `USING` and `WITH CHECK` for updates.
- Database selects name their columns explicitly instead of using `select(*)`.
- The Overview fetches independent datasets in parallel.
- The application has useful empty states in several places and a consistent responsive visual language.
- `npm run lint`, `npx tsc --noEmit`, and `npm run build` all pass.

Audit limitations:

- This reviewed the repository and migration source, not the live Supabase project's applied schema, advisors, or query plans.
- There is no automated browser/E2E suite, so authenticated user journeys are currently verified manually.
- `npm audit --omit=dev` reports two moderate findings from Next.js's transitive PostCSS dependency. Do not run the suggested `npm audit fix --force`; it proposes a breaking Next.js downgrade. Track the upstream Next.js/PostCSS patch instead.

## Priority guide

- **P0 — Foundation:** prevents misleading metrics, data loss, or scaling/security problems.
- **P1 — High value:** materially improves the daily dashboard experience.
- **P2 — Quality of life:** removes friction and makes the app feel polished.
- **P3 — Later:** valuable once the foundation and daily workflows are stable.

## P0 — Foundation before more dashboard cards

### 1. [x] Store real task and fitness history

**Impact:** Very high  
**Effort:** Medium–large

Current task rollover and productivity history depend on `tasks.updated_at`. Editing a completed task changes that timestamp, which can move a historical completion to another day. Fitness stores one mutable row per weekday, so resetting or editing the plan destroys the previous week's result. The productivity graph therefore has trustworthy task history only when completed tasks were never edited, and no trustworthy historical fitness sessions.

I would introduce:

- `tasks.completed_at timestamptz null` set only when completion changes.
- Optional `task_events` or `task_completions` if reopen/complete history matters.
- A reusable `fitness_plan_days` template for the intended weekly schedule.
- A separate `fitness_sessions` table with `performed_on`, sport, duration, quality, notes, and completion state.
- A `week_start` or actual calendar date instead of treating `monday` as permanent state.

This unlocks accurate daily reset behavior, streaks, week-over-week comparisons, training history, and a meaningful productivity chart.

Relevant code:

- `src/lib/tasks.ts` uses `updatedAt` to decide whether a completed task is visible today.
- `src/app/page.tsx` derives task productivity from `updatedAt` and fitness productivity from the current mutable weekly plan.
- `src/lib/fitness.ts` maps one database row to each weekday with no calendar week.

### 2. Add user settings for timezone, locale, currency, and week start

**Impact:** High  
**Effort:** Medium

The task system currently hardcodes `Europe/Bratislava`; the document language is Slovak while most interface copy is English; finance is always EUR; and the week always begins Monday. These should be profile settings rather than code constants.

Suggested profile fields:

- `timezone` (IANA value, default `Europe/Bratislava`)
- `locale` (for example `sk-SK` or `en-GB`)
- `currency` (default `EUR`)
- `week_starts_on` (`monday` or `sunday`)
- display name and initials

Use the settings for task day boundaries, date labels, currency formatting, calendar ordering, and the navigation avatar.

### 3. [x] Harden database constraints, indexes, and read filters

**Impact:** High  
**Effort:** Small–medium

RLS is correctly configured, but the schema has no explicit indexes on most ownership columns and application reads do not also filter by `user_id`. RLS remains the security boundary; explicit filters and indexes make the intended query plan clear and avoid full scans as data grows.

Recommended indexes after checking query plans:

```sql
create index tasks_user_created_idx
  on public.tasks (user_id, created_at desc);

create index tasks_user_due_idx
  on public.tasks (user_id, due_date)
  where completed = false;

create index finance_user_date_idx
  on public.finance_transactions (user_id, date desc, created_at desc);
```

`fitness_weekly_plan` already has `unique(user_id, weekday)`, which supplies a useful composite index. `tasks.user_id` and `finance_transactions.user_id` are foreign keys but PostgreSQL does not automatically index the referencing side.

Also add `.eq("user_id", user.id)` to task, fitness, and finance read queries. This duplicates the RLS predicate intentionally for performance while preserving RLS as defense in depth.

Add database checks so invalid values cannot enter through a future client or manual API call:

- task type, complexity, priority, and estimate mode
- finance status
- fitness weekday, sport, and quality
- non-negative estimate/duration values
- bounded text lengths for titles, categories, and notes
- use a `time` column instead of free-text time where possible
- make required timestamps `not null`

The migration already has explicit Data API grants, which is important under Supabase's 2026 exposure changes.

### 4. [x] Make destructive actions safe and recoverable

**Impact:** High  
**Effort:** Small

The current UI immediately deletes a task, clears all finance data, or resets the entire fitness week. These actions need an `AlertDialog` confirmation that names the consequence.

Best version:

- Confirm before task delete, finance clear, and fitness reset.
- Prefer soft delete/archive for tasks and transactions where history matters.
- Show an Undo toast for a few seconds after small destructive actions.
- Require typing a confirmation phrase only for “clear all finance data.”
- Return friendly action results instead of throwing raw database errors into a route error boundary.

### 5. Fix period semantics in finance summaries

**Impact:** High  
**Effort:** Small

`getFinanceSummary` defines “current month” from the newest transaction date, not today's date. If the newest import is old or contains a future scheduled transaction, “This month,” income, expenses, net cashflow, and the dashboard ring can describe a different month without saying so.

Recommended behavior:

- Default to the user's actual current month.
- Add an explicit month selector on Finance.
- Keep pending/scheduled amounts separate from paid cashflow.
- Label every summary with the selected month and year.
- Define the finance ring as a user goal (budget used, savings rate, or cashflow target) instead of an unlabeled `net / income` percentage.

## P1 — Dashboard improvements

### 6. [x] Add a true “Today” command strip

**Impact:** Very high  
**Effort:** Medium

The top of Overview should answer: “What should I do next?” before showing analytics.

Suggested strip:

- next high-priority or overdue task
- today's workout and planned time
- pending finance item due soon
- one universal Quick Add button
- current date and a short day-status summary

Quick Add could open a keyboard-friendly command palette (`Cmd/Ctrl + K`) with actions such as:

- add task
- log workout
- add transaction
- mark current task done
- jump to Tasks/Fitness/Finance

### 7. [x] Make Quick Tasks more actionable

**Impact:** High  
**Effort:** Small–medium

The Overview list currently shows the newest six records. A better ordering would be:

1. overdue tasks
2. due today, highest priority first
3. future tasks by due date
4. completed-today tasks last or collapsed

Add compact filters for `Today`, `Overdue`, and `Upcoming`, plus a “View all” link. Use relative labels such as “2 days overdue” and “Tomorrow” rather than only ISO dates.

### 8. [x] Upgrade the Productivity chart after history is fixed

**Impact:** High  
**Effort:** Medium

Once completion/session history exists, make the graph a reliable weekly score rather than a count from mutable rows.

Possible definition:

- 60% task completion against tasks planned for that day
- 25% planned fitness completion
- 15% focus-time target

Product requirements:

- Explain the formula beside the graph.
- Show the previous week as a faint comparison line.
- Display actual values in tooltips/focus popovers.
- Mark today distinctly and keep future days empty, not zero.
- Provide an accessible text/table summary under the visual.
- Let the user disable domains they do not want included.

### 9. [x] Add a weekly review card

**Impact:** High  
**Effort:** Medium

A compact Sunday/Monday review would make Orbit feel like a personal operating system rather than four separate CRUD pages.

Include:

- tasks planned vs completed
- overdue tasks carried forward
- training sessions and total minutes
- income, expenses, and savings rate
- comparison with the previous week
- one editable reflection: “What worked?” / “What changes next week?”

### 10. Make the dashboard customizable

**Impact:** Medium–high  
**Effort:** Medium

Allow users to:

- reorder cards
- hide cards they do not use
- choose compact or comfortable density
- choose the default Overview date range
- pin one task category or finance metric

Store layout preferences in the profile rather than browser-only storage so they follow the user between devices.

### 11. Replace placeholder navigation affordances with real features

**Impact:** Medium  
**Effort:** Small–medium

The desktop navigation currently shows a notification bell with a permanent pink dot and a hardcoded `P` avatar. Until notifications/profile exist, these controls imply functionality that is not there.

Options:

- Implement notifications for overdue tasks, today's workout, and scheduled transactions.
- Add a real Settings/Profile route using the user's initials and preferences.
- Or remove the bell/avatar placeholders until those flows exist.

The navigation does not need to be a Client Component today; it contains links and regular forms but no client state or browser APIs. Moving it back to a Server Component would remove unnecessary dashboard JavaScript.

## P1 — Domain improvements

### Tasks

- Add search, status/category/priority filters, and due-date sorting.
- Add recurring tasks with clear recurrence rules and generated occurrences.
- Add subtasks/checklists for larger work without turning every step into a top-level task.
- Add an archive/history screen instead of making previous completions invisible.
- Add bulk actions: complete, move date, change category, archive.
- Add keyboard entry: Enter to create, shortcuts for priority/date, and `/` to focus search.
- Default the due date to today while keeping “No date” an explicit choice.
- Add a “Start focus” timer that records actual focus minutes separately from estimates.
- Preserve a task's completion state intentionally when editing and store completion transitions server-side.

### Fitness

- Automatically roll into a new calendar week without deleting the previous week.
- Separate reusable weekly templates from actual logged sessions.
- Add exercise-level logging, sets/reps/weight, and personal records for gym sessions.
- Show training volume and duration trends.
- Let users duplicate last week's plan and adjust it.
- Add deload/recovery flags and simple readiness notes.
- Use `type="time"` for workout time and add an input maximum matching the server's duration limit.
- Validate `weekday` and `sport` in `toggleFitnessDoneAction`; it currently casts untrusted form strings.
- Make the initial plan creation an atomic upsert to avoid two first-load requests racing on the unique `(user_id, weekday)` constraint.

### Finance

- Add manual create/edit/delete transaction forms; CSV should be an import option, not the only entry path.
- Add import preview, duplicate detection, and a mapping step before writing rows.
- Add budgets per category with used/remaining progress.
- Add recurring transactions and upcoming bills.
- Separate account balance from monthly income/expense summaries.
- Add date-range, category, status, and text filters.
- Add pagination or cursor-based “load more” for transaction history.
- Export only the current filter/range, with an option for all data.
- Add clear empty states to the Finance cashflow, transaction, and category cards.
- Put an explicit file-size and row-count limit on CSV uploads.

## P2 — Quality-of-life polish

### Feedback and loading

- Add `loading.tsx` skeletons for Overview, Tasks, Fitness, and Finance.
- Add route-level `error.tsx` files with retry buttons and friendly copy.
- Use `useFormStatus` or action-state feedback for task toggles, deletes, reset, and clear actions.
- Add a consistent toast system for success, failure, and undo.
- Disable controls while their mutation is pending to prevent double submits.
- Preserve focus after mutations and announce results through `aria-live`.

### Mobile and responsive behavior

- Turn Quick Add into a bottom sheet on phones.
- Keep the mobile navigation within safe-area insets and test it at 320–430 px widths.
- Avoid five equally weighted bottom-nav items on very narrow screens; move Logout into Settings.
- Keep important task actions visible without forcing horizontal compression.
- Test the equal-width Overview graphs at 640–900 px with six months/seven days of labels.

### Accessibility

- Add visible `focus-visible` styles globally; most controls currently emphasize hover only.
- Respect `prefers-reduced-motion` for modal/card transitions.
- Give graphs accessible data summaries with real values, not only a generic `role="img"` label.
- Review muted text colors and 11 px labels for contrast and readability.
- Ensure destructive buttons communicate their consequence before activation.
- Use consistent input error messages associated with fields.

### Language and formatting

- Choose a single UI language per user. Fitness data currently mixes Slovak labels/descriptions with English navigation and actions.
- Format dates through the selected locale instead of showing raw `YYYY-MM-DD` everywhere.
- Format durations and pluralization consistently.
- Use the profile currency and locale for finance instead of hardcoded `sk-SK`/EUR.

## P2 — Engineering quality

### 12. Add automated tests around the risky pure logic

**Impact:** High  
**Effort:** Medium

Start with fast unit tests for:

- task day classification across timezone/DST boundaries
- daily rollover visibility
- category frequency/casing
- cross-midnight time estimates
- finance CSV quoting, CRLF, malformed rows, and partial imports
- finance month selection and summary totals
- fitness week/date mapping
- productivity aggregation

Then add Playwright smoke tests for:

- sign up/login/logout
- create/edit/complete/roll over/delete task
- update/reset/log fitness
- finance import/export/clear confirmation
- authenticated route redirects
- Overview at phone, tablet, and desktop widths

Add scripts such as `typecheck`, `test`, and `test:e2e`, then run them in CI with lint and build.

### 13. Split oversized components and introduce reusable primitives

**Impact:** Medium  
**Effort:** Medium

`FitnessClient.tsx` is about 600 lines and `page.tsx` is about 490 lines. The app also repeats buttons, badges, panels, fields, metrics, chart legends, and destructive styles.

Suggested boundaries:

- `components/ui/Button`, `Panel`, `Field`, `Badge`, `Metric`, `EmptyState`, `ConfirmAction`
- `components/charts/CashflowChart`, `ProductivityChart`, `ProgressRing`
- `features/tasks/*`, `features/fitness/*`, `features/finance/*`
- shared design tokens for surfaces, borders, status colors, radii, and muted text

Keep route data fetching in Server Components and place `"use client"` only around the smallest interactive island.

### 14. Make data access explicit and scalable

**Impact:** Medium–high  
**Effort:** Medium

Current Overview loads all task history and all finance transactions on every request, then aggregates in JavaScript. Supabase also limits responses (commonly 1,000 rows), so totals can eventually become silently incomplete.

Recommended evolution:

- Paginate detailed history screens.
- Query only current/needed ranges for dashboard cards.
- Add small database functions or security-invoker views for aggregate metrics when volume justifies it.
- Include explicit `user_id` filters in every read query.
- Add composite indexes that match filter/order pairs.
- Measure with `EXPLAIN (ANALYZE, BUFFERS)` and Supabase advisors before keeping new indexes.

### 15. Improve repository and deployment hygiene

**Impact:** Medium  
**Effort:** Small

- Add a committed `.env.example`. README currently tells users to copy it, but `.env*` is ignored and the file does not exist. Add `!.env.example` to `.gitignore`.
- Remove unused default Next.js SVG assets from `public/`.
- Add a CI workflow for lint, typecheck, unit tests, and build.
- Add Dependabot/Renovate and review dependency updates instead of relying on force audit fixes.
- Track the current PostCSS advisory and update Next.js when its dependency is patched.
- Add preview-deployment smoke checks.
- Add structured error logging/observability for failed Server Actions without logging finance data or credentials.
- Document backup/export and migration rollback expectations.

## P3 — Larger product ideas

- **Unified calendar:** tasks, workouts, and scheduled transactions on one date-based view.
- **Goals:** connect tasks, fitness sessions, and savings targets to quarterly goals.
- **Habit tracking:** lightweight daily habits distinct from tasks and training sessions.
- **Focus mode:** one task, timer, distraction-free screen, and end-of-session note.
- **Notifications:** daily digest and reminders through email/web push, with granular opt-in settings.
- **Natural-language capture:** “Gym tomorrow 18:30 for 60m” or “Paid 42 EUR for groceries” parsed into a reviewable form.
- **Data portability:** full JSON/CSV export and account deletion flow.
- **Offline/PWA mode:** cached read-only dashboard plus queued task/fitness updates.

## Recommended implementation sequence

### Milestone 1 — Trustworthy history

1. Add profile timezone/locale/currency settings.
2. Add `completed_at` and fitness session history with a clean migration.
3. Update rollover and productivity calculations to use immutable event dates.
4. Add ownership indexes, explicit read filters, and database constraints.

### Milestone 2 — Safe daily use

1. Add confirmations/undo for destructive actions.
2. Add pending, success, and friendly error feedback.
3. Fix finance period semantics.
4. Add task ordering/filtering and manual finance transactions.

### Milestone 3 — Overview v2

1. Add the Today command strip and universal Quick Add.
2. Upgrade productivity with real history and comparisons.
3. Add the weekly review card.
4. Replace placeholder bell/avatar with Settings and real notifications—or remove them.

### Milestone 4 — Confidence and scale

1. Add unit and Playwright tests.
2. Add CI and dependency automation.
3. Paginate history and move heavy aggregates closer to PostgreSQL where measured.
4. Add loading/error states, accessibility polish, and responsive regression tests.

## Useful references

- [Supabase RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase query optimization](https://supabase.com/docs/guides/database/query-optimization)
- [Supabase 2026 Data API exposure change](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically)
- [PostCSS advisory reported by npm audit](https://github.com/advisories/GHSA-qx2v-qp2m-jg93)
