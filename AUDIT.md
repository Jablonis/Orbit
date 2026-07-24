# Orbit Dashboard Audit — Active Findings

Last updated: 2026-07-24

This file contains only unresolved or partially resolved findings. Remove an
item after its implementation and proportionate verification.

## Audit-first workflow

Every dashboard work session starts by reviewing the current application state
and this file before planning or implementation:

1. Read `PROJECT_MEMORY.md`, `AUDIT.md`, and the relevant product/design notes.
2. Check the working tree and inspect the current implementation affected by the
   requested work.
3. Re-run proportionate baseline checks and confirm that listed findings are
   still true.
4. Add newly discovered findings, remove verified completed findings, and work
   in priority order.
5. Record any verification boundary instead of treating an untested flow as
   passing.

## Current verification boundary

Verified on 2026-07-24:

- ESLint passes.
- Strict TypeScript passes.
- The full test command passes 44 tests, including calendar/DST boundaries,
  effective-dated fitness plans, CSP policy, database-grant contracts, upload
  guard ordering, safe authentication return paths, reviewed Fitness setup,
  Settings dismissal protection, recovery-flow contracts, and 9 static UI
  contract checks.
- The 9-test UI contract subset also passes independently.
- The Next.js 16.2.11 production build passes.
- Signed-out `/`, `/tasks`, `/fitness`, `/finance`, and `/ui-lab` requests
  redirect to `/login`.
- Signed-out `/api/search` and `/api/export` requests return `401`.
- A production response carries a per-request CSP nonce and its `script-src`
  contains no `unsafe-inline`.
- `npm audit --omit=dev` reports zero production dependency vulnerabilities.
- Live Supabase migrations, RLS policies, function grants, and plan-history
  backfill were applied and queried successfully. `fitness_profiles` has
  owner-scoped select/insert/update policies, anonymous clients have no table or
  setup-RPC access, and the setup RPC runs as security invoker. The security
  advisor reports only leaked-password protection as disabled. Performance
  advisors report only informational unused-index notices.

Not verified in this audit:

- Authenticated browser flows, screenshots, responsive layouts, 200% zoom,
  screen readers, forced colors, mobile keyboards, and authenticated CSP console
  output. No browser runtime or reusable signed-in browser was available.
- Cross-user RLS behavior using isolated test identities.
- Vercel Firewall/IP throttling and concurrent multi-instance upload behavior.
  This checkout has no `.vercel` project link or Vercel API credential.
- Auth signup/password-manager behavior after leaked-password protection is
  enabled.
- End-to-end recovery email delivery, deployed redirect-URL configuration,
  expired-link handling, password-manager autofill, and recovery forms with a
  mobile keyboard.
- Production Core Web Vitals and the budgets in `ui-quality.config.json`.

# Priority 1 — Correctness, security, and trust

## P1-03 — Add authenticated browser and database-policy regression coverage

CI now also runs a production dependency audit. Source tests cover the new CSP,
anonymous fitness-history grants, and upload defense ordering; live metadata
checks confirmed owner policies and anonymous grant removal. It still does not
prove complete authenticated behavior, actual responsive layout, or cross-user
ownership enforcement with isolated identities.

**Required work**

- Add isolated database tests for RLS, composite ownership constraints, and
  archive/import functions.
- Add authenticated browser flows for every route, Quick Add, Settings, task
  mutations, fitness logs, Finance changes, statement preview/import, undo, and
  expired sessions.
- Consume the route/viewport/state matrix in `ui-quality.config.json`.
- Use deterministic non-personal seed fixtures for empty, typical, dense,
  failure, stale, and long-content states.

**Acceptance:** CI can catch a broken authenticated flow, cross-user data
access, modal/focus regression, or viewport overflow before deployment.

## P1-04 — Remove production `script-src 'unsafe-inline'`

The code and signed-out production response now use the supported Next.js
per-request nonce with `strict-dynamic`, and production `script-src` contains no
`unsafe-inline`. Authenticated browser verification remains unavailable.

**Required work:** verify authenticated App Router streaming, Server Actions,
authentication, fonts, and the PDF worker in a real browser without CSP console
violations.

**Acceptance:** production responses do not require
`script-src 'unsafe-inline'`, and authenticated browser flows produce no CSP
errors.

## P1-05 — Complete deployment-level upload-abuse defenses

Statement import already enforces the streamed body size and a private per-user
limit of 10 requests per 10 minutes. It does not yet provide a trusted
distributed/IP layer before application parsing.

**Required work:** link the deployment, add a Vercel Firewall rule for
`POST /api/finance/import-statement` using a fixed-window IP limit, then test
concurrent and multi-instance requests. Keep the existing authenticated
per-user database throttle as the second layer.

**Acceptance:** oversized and abusive requests are rejected before expensive PDF
work, while normal authenticated imports remain reliable.

## P1-06 — Enable leaked-password protection

The 2026-07-24 live Supabase security advisor confirms leaked-password
protection is disabled. The available project tools do not expose the Auth
setting required to change it.

**Required work:** verify the current Auth setting, enable breached-password
protection if still disabled, review the password policy, and re-run the
security advisor.

**Acceptance:** the advisor no longer reports the warning and normal sign-up,
login, and password-manager behavior still works.

# Priority 2 — Daily-use UX and visual validation

## P2-03 — Complete entry and account recovery flows

Protected redirects now carry a validated Orbit-only path through login.
Forgot-password, PKCE callback, reset-password, expired-link, and completed
recovery states are implemented with password-manager autocomplete tokens and
open-redirect regression coverage.

**Required work:** confirm the deployed `/auth/callback` URL is allowlisted in
Supabase Auth, then verify real recovery email delivery, password-manager
autofill, expired links, and mobile keyboard behavior in a browser/device run.

**Acceptance:** users recover access and return to their intended Orbit route
without open-redirect risk.

## P2-05 — Execute the responsive, accessibility, and performance matrix

Static contracts cannot prove real layout and interaction quality. The matrix in
`ui-quality.config.json` remains unexecuted against authenticated states.

**Required work**

- Check `/`, `/tasks`, `/fitness`, `/finance`, `/login`, and `/ui-lab` at 320,
  375, 430, 768, 1024, and 1440 px plus 200% zoom.
- Cover empty, typical, dense, error, stale, and long-content states.
- Verify keyboard order, focus return, modal inertness, VoiceOver/NVDA, reduced
  motion, forced colors, safe areas, and the on-screen keyboard.
- Measure CLS, INP, LCP, and local action-feedback latency against the recorded
  budgets.
- Approve and automate visual regression baselines after manual review.

**Acceptance:** results are recorded, failures are fixed, and repeatable visual
checks run in CI.

# Priority 3 — Maintainability and premium polish

## P3-01 — Split oversized route and client modules by responsibility

Several files now concentrate too much UI and behavior:

- `src/app/page.tsx` — 1,193 lines
- `src/app/tasks/TasksClient.tsx` — 982 lines
- `src/app/fitness/FitnessClient.tsx` — 750 lines
- `src/app/finance/FinanceClient.tsx` — 693 lines
- `src/components/QuickAdd.tsx` — 526 lines
- `src/components/DashboardCustomizer.tsx` — 485 lines

**Required work:** extract route sections, state hooks, validation helpers, and
focused interaction components where the boundaries are stable. Keep data
fetching server-side and avoid creating wrapper-only component layers.

**Acceptance:** each extracted unit has one clear responsibility, existing
behavior remains covered, and route composition becomes easier to audit.

## P3-02 — Finish migration to semantic UI primitives

`docs/UI_SYSTEM.md` defines canonical primitives and semantic surface roles, but
many route components still rely on legacy `content-panel`, `glass-panel`, and
route-specific styling.

**Required work:** migrate touched areas incrementally, remove duplicate visual
roles, and add a lint/static rule for new raw color values when practical.

**Acceptance:** new features use the canonical component/tokens layer and no
longer introduce another visual dialect.

## P3-03 — Monitor currently unused database indexes

The last recorded live performance advisor reported these informational unused
indexes:

- `tasks_user_created_idx`
- `tasks_user_due_idx`
- `task_completions_user_date_idx`
- `fitness_sessions_user_date_idx`
- `finance_transactions_statement_import_owner_idx`
- `task_completions_task_owner_idx`

They support current queries or ownership constraints, so do not remove them
without representative production traffic and query-plan evidence.

**Acceptance:** reassess after meaningful traffic; retain, consolidate, or remove
each index based on measured usage and query plans.

## Recommended execution order

1. Add authenticated browser and isolated database-policy coverage.
2. Verify recovery email delivery and deployed redirect configuration.
3. Execute the responsive, accessibility, CSP, and performance matrix.
4. Link deployment-level upload throttling and enable leaked-password
   protection.
5. Refactor large modules only alongside verified product work.
