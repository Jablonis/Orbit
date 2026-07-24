# Orbit routes

| Route | Access | Purpose |
| --- | --- | --- |
| `/` | authenticated | Overview command center |
| `/tasks` | authenticated | task planning, filtering, bulk actions |
| `/fitness` | authenticated | weekly plan, setup, and training history |
| `/finance` | authenticated | cashflow, ledger, statement import |
| `/ui-lab` | authenticated | shared primitive reference |
| `/login` | public | login and account creation |
| `/forgot-password` | public | request a recovery email |
| `/reset-password` | recovery session | choose a new password |
| `/auth/callback` | public callback | exchange PKCE code and continue safely |
| `/auth/logout` | authenticated POST | end the session |
| `/api/search` | authenticated | Quick Add entity search |
| `/api/export` | authenticated | account data export |

`src/proxy.ts` and `src/lib/supabase/proxy.ts` refresh authentication and guard
protected pages/APIs. Protected page redirects carry a validated local `next`
path.
