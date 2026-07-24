# Orbit page dependency trees

## Overview

`src/app/page.tsx`
→ `AppNavigation`
→ Now hero, Orbit Brief, Today, Trends
→ `DashboardCustomizer` inside `ProfileMenu`

## Fitness

`src/app/fitness/page.tsx`
→ authenticated fitness/profile queries
→ no-plan setup state or `FitnessClient`
→ editable training setup and weekly plan/session review

## Login and recovery

`src/app/login/page.tsx` → `LoginForm`

`src/app/forgot-password/page.tsx` → recovery request form

`src/app/auth/callback/route.ts` → safe PKCE exchange

`src/app/reset-password/page.tsx` → new-password form

## Global Quick Add

`AppNavigation` → `QuickAdd`
→ local commands always available
→ `/api/search` entity results, explicit loading/error/retry state
