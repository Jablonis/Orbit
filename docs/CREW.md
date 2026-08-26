# Crew

Orbit is single-player until someone hands you a code. The crew is the answer
to the only question a solo tracker cannot answer: *is anyone else doing this
today?*

## What crosses between two accounts

One published day, and nothing else:

| Field | Example |
| --- | --- |
| Score | `80` |
| Altitude | `68` |
| Tier | `mid-orbit` |
| Run | `6` |
| Rings closed / active | `2` of `3` |

Task titles, training sessions, transactions, imports and preferences never
leave the account. There is no photo, no text field, and nothing free-form —
so there is nothing to moderate and nothing to leak.

## How you get in

A crew code: eight characters from a 32-symbol alphabet, minted by the
database, never chosen by a client. No search, no directory, no suggestions —
if nobody gives you a code, there is nobody to find. Entering the code of
someone who already asked for yours accepts their request instead of stacking a
second one.

Either side can leave at any time without asking the other.

## What it shows

- **This week** — a table ordered by days in orbit, then by points. You are
  always on it, even with nothing logged: a board you are missing from is not a
  board you compete on.
- **Lately** — a fortnight of published days, newest first, each one line in
  Orbit's own vocabulary ("Ada closed every ring") rather than a number dump.
- **Reactions** — three of them, one tap, and sending the same one again takes
  it back. Enough to say *I saw that*; not enough to become a comment section.

## Where the numbers come from

Nothing is computed twice. The Overview already derives today's score,
altitude, tier, run and rings; if the account has anyone in its crew it
publishes exactly that. An account with an empty crew publishes nothing at all,
so there is no row to read for someone who is not sharing with anybody.

## How it is locked down

- Every crew table has row-level security on, is revoked from `anon` and
  `public`, and grants `select` only — every write goes through a
  security-definer function with a pinned `search_path`.
- A snapshot is keyed on `auth.uid()`, never on anything the client sends, so a
  client cannot publish a day as somebody else.
- Reading a snapshot requires an **accepted** link (`is_crew`). Reading a name
  requires a link in any state (`has_crew_link`), because a pending request has
  to say who sent it.
- A reaction is refused unless the two accounts are already in the same crew.

## Where the code lives

| Concern | File |
| --- | --- |
| Schema, policies and functions | `supabase/migrations/20260825140000_add_crew.sql` |
| Feed, table and standings (pure, unit tested) | `src/lib/crew.ts` |
| Page | `src/app/crew/page.tsx`, `src/components/crew/CrewBoard.tsx` |
| Code panel and add-by-code | `src/components/crew/CrewCodePanel.tsx` |
| Actions | `src/app/crew/actions.ts` |
| Tests | `tests/crew.test.ts`, the crew case in `tests/security.test.ts` |
