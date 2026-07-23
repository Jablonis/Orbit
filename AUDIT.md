# Orbit Application Audit — Remaining Work

Last updated: 2026-07-23

This file intentionally contains only unresolved or partially resolved findings.
Completed audit items are removed after their implementation and verification.

## Current verification boundary

- Production build, strict TypeScript, and ESLint pass.
- Twelve TypeScript parser/export/scoring/query-state tests pass without a
  module-type warning.
- Signed-out authenticated routes redirect to `/login`.
- The same-origin signed-out PDF route returns JSON `401`.
- Live Supabase schema checks and advisors were run after the latest migrations.
- Authenticated browser flows, screenshots, real-device behavior, and 200% zoom
  remain unverified because no browser backend is attached.

## Priority 0 — deployment blocker

### P0-01 — Upgrade Next.js from 16.2.10

The installed Next.js `16.2.10` remains affected by current high-severity
advisories, including a Proxy bypass relevant to Orbit's route protection.

**Required work**

1. Upgrade `next` and `eslint-config-next` together to a current compatible patch.
2. Run lint, TypeScript, tests, build, dependency audit, and the signed-out route
   matrix.
3. Verify every authenticated page and Server Action with an expired session.

**Acceptance:** `npm audit --omit=dev` reports no applicable Next.js/Sharp
advisory and all verification checks pass.

## Priority 1 — correctness and security

### P1-07 — Complete platform/IP upload-abuse defenses

Orbit now enforces the actual streamed body size before multipart parsing and a
private per-user limit of 10 requests per 10 minutes.

**Remaining work:** add deployment-level body enforcement, a trusted
platform/distributed IP throttle, and validate it under concurrent load.

### P1-08 — Preserve historical planning semantics

`src/lib/dashboard.ts` applies the current reusable weekday plan to historical
dates. Changing the plan can therefore change previously calculated productivity.

**Required work:** store dated plan snapshots or introduce plan versions with an
effective date. Closed days and weeks must not change when a future plan changes.

### P1-11 — Add automated authenticated flow and responsive coverage

The repository has parser/export unit tests but no authenticated component,
database-policy, or Playwright flow suite and no CI workflow.

**Required work**

- unit tests for task dates, fitness mutation behavior, dashboard scoring, and
  preference parsing;
- database tests for RLS, ownership constraints, and atomic functions;
- Playwright flows for authentication, every route, destructive confirmations,
  keyboard behavior, PDF import, and the target viewport matrix;
- CI for lint, TypeScript, tests, build, and dependency audit.

### P1-12 — Replace production script `unsafe-inline`

`next.config.ts` still permits inline scripts in production CSP.

**Required work:** implement the Next.js 16 nonce/hash pattern and verify App
Router streaming, fonts, authentication, and the PDF worker without CSP
violations.

### P1-13 — Enable leaked-password protection

The live Supabase security advisor still reports leaked-password protection as
disabled.

**Required work:** enable the setting, review the minimum-password policy, and
re-run the security advisor.

## Priority 2 — visual verification

### P2-12 — Validate metadata readability on real devices and at 200% zoom

Critical 10–11 px application metadata has been raised to 12 px. Static code,
lint, TypeScript, and build checks cannot verify real-device readability or
reflow.

**Required work:** execute the viewport/zoom matrix below and correct any
clipping, overlap, or unreadable chart labels found.

## Priority 3 — polish and operational follow-up

### P3-03 — Monitor currently unused indexes

The live performance advisor was re-run on 2026-07-23 and still reports these
unused indexes at informational severity:

- `tasks_user_created_idx`
- `tasks_user_due_idx`
- `task_completions_user_date_idx`
- `fitness_sessions_user_date_idx`
- `finance_transactions_statement_import_owner_idx`
- `task_completions_task_owner_idx`

The app is new and these indexes support current queries or ownership checks.
Reassess with meaningful production traffic before removing any index. See the
[Supabase unused-index guidance](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).

## Required browser matrix

### Viewports

- 320 × 568
- 375 × 667
- 430 × 932
- 768 × 1024
- 1024 × 768
- 1440 × 900
- 200% desktop zoom and mobile-width reflow
- iOS safe-area simulation and Android keyboard-open behavior

### Checks on every authenticated route

1. No horizontal page scroll or unintended clipping.
2. The final control scrolls above the mobile navigation.
3. Settings, Quick Add, task form, and confirmation dialogs fit within `100dvh`.
4. Tab order matches visual order and focus is always visible.
5. Escape closes the active modal and focus returns to its opener.
6. Modal background controls are inert.
7. Long labels, titles, notes, amounts, and warnings wrap intentionally.
8. Pending states prevent duplicate submissions without losing input.
9. Success and error feedback is visible and announced.
10. Reduced-motion mode removes nonessential animation.

### End-to-end stories

1. Sign-up → confirmation if enabled → login → logout → protected redirect.
2. Task create → edit → complete → reopen → archive → failed undo → retry.
3. Fitness plan edit → detailed log → Overview toggle → detail preservation.
4. PDF preview with duplicates and 10+ rows → full review → import → duplicate
   rejection.
5. Invalid, scanned, protected, oversized, wrong-origin, expired, and
   rate-limited PDF requests.
6. CSV export containing commas, quotes, newlines, Unicode, and formula-leading
   text.
7. Finance clear → failed undo → retry → atomic restoration.
8. Overview preferences and reflection save → reload → sign out/in → persistence.

## Recommended next order

1. Resolve P0-01 before another production deployment.
2. Add the authenticated Playwright/CI baseline in P1-11.
3. Execute P2-12's browser matrix.
4. Design and migrate the historical-plan model in P1-08.
5. Harden CSP and platform upload controls.
6. Enable the Supabase Auth password setting.
7. Reassess P3-03 after meaningful production traffic.
