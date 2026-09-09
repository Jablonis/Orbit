# Orbit

Orbit is a private personal operating-system dashboard for tasks, reusable
fitness planning, dated training history, finance statement imports, daily
progress, productivity trends, and weekly reflection.

The app uses Next.js 16 App Router, React 19, strict TypeScript, Tailwind CSS 4,
Supabase Auth, and Supabase Postgres with row-level security.

## Local setup

Install dependencies and create the local environment file:

```bash
npm install
cp .env.example .env.local
```

Set the public Supabase connection values:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

`NEXT_PUBLIC_SUPABASE_ANON_KEY` remains supported for older projects. Never put a
service-role or secret key in a client-visible environment variable.

The evening reminder needs four more, all server-side except the public VAPID
key:

```bash
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_SUBJECT=mailto:you@example.com
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CRON_SECRET=a-long-random-string
```

Generate the VAPID pair once with `npx web-push generate-vapid-keys`. The
private key, the service-role key and the cron secret must never appear in a
`NEXT_PUBLIC_*` variable — that ships them to the browser. The service-role key
exists for one job: the scheduled sender has to read every account's reminder
settings, which row-level security correctly forbids.

Start the application:

```bash
npm run dev
```

Open `http://localhost:3000`. Signed-out users are redirected to `/login`.

## Supabase setup

1. Create or select a Supabase project.
2. Enable Email/Password authentication.
3. Link the local project and apply every migration in `supabase/migrations`:

```bash
npx supabase link --project-ref your-project-ref
npx supabase db push
```

4. Add the local and production URLs to the Supabase Auth site/redirect URL
   configuration.
5. Enable leaked-password protection and choose an appropriate minimum-password
   policy before production use.

The migrations create and secure:

- profiles and dashboard preferences;
- tasks plus immutable completion history;
- reusable fitness plan days plus dated training sessions;
- finance transactions and monthly statement-import summaries;
- atomic Finance import, archive, and restore functions;
- composite ownership constraints and a private statement-upload rate limit;
- a single-call, append-only import for a training history from another app.

All exposed user tables use RLS. Application reads also filter by the
authenticated user.

## The public landing page

Signed-out visitors at `/` are sent to `/welcome`, a public page that explains
the momentum mechanic with charts drawn by the real engine, shows the ring
system, and states pricing honestly. Shared links render the branded preview in
`src/app/opengraph-image.tsx`. The brand system — voice, mark, colour, motion —
is documented in `docs/BRAND.md`.

## The evening reminder

Orbit can send one notification in the evening carrying the score today still
needs — "Finish today at 49 %". It is off until you turn it on in dashboard
settings, it never arrives on a day already in orbit, and it arrives once:
`/api/push/send` works out who is at or past their chosen local hour and claims
the day with an insert before it sends, so two overlapping runs cannot both
deliver. Subscriptions that a push service reports as gone (404 or 410) are
deleted immediately.

`vercel.json` schedules it once a day, at 17:00 UTC — a Vercel Hobby project may
only run a cron daily, and a deployment declaring anything more frequent is
rejected. On a plan that allows more, change the schedule to `0 * * * *`: an
hourly run reaches every timezone at its own chosen hour, and nothing else has
to change.

On iPhone, Safari only allows notifications for an app added to the home
screen; the setting says so rather than failing silently.

## The exercise library

`/fitness/library` carries 1 324 exercises with written instructions, searchable
and filterable by body part, equipment, and whether your own kit can do it. The
programme is still generated from the 55 curated lifts in `src/lib/exercises.ts`
— the catalogue answers the other question a gym produces, what a lift is and
what else trains the same muscle. Where a curated lift has an honest equivalent
in the catalogue, its instructions also appear under "How to do it" in the
session log.

Names, metadata and instructions come from
[hasaneyldrm/exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset)
under the MIT licence, baked into `src/lib/exercise-catalog.json` by
`scripts/build-exercise-catalog.mjs` so no build reaches the network. The file
is read only on the server; a phone receives the page of rows it asked for.

The animations and photographs are **© Gym visual** and are not in this
repository. To show them, settle your own terms at
[gymvisual.com](https://gymvisual.com/), run `scripts/fetch-exercise-media.sh`,
and set:

```bash
NEXT_PUBLIC_EXERCISE_MEDIA_BASE=/exercise-media
```

Without it Orbit renders the names and the steps, which is the default.

## The muscle map

The programme's promise — every muscle group at least twice a week — is drawn
on a body as well as counted in a grid. The map is the glance and the grid is
the record: a bare back registers before a number is read, and the exact count
is right underneath it, because colour alone says nothing to a colour-blind
reader and nothing at all to a screen reader.

The outlines are derived from [MuscleMap](https://github.com/melihcolpan/MuscleMap)
by Melih Colpan under the MIT licence; `src/lib/body-map.ts` carries the full
notice. They are drawn on the server, so the 42 kB of path data never reaches
a phone.

## The rest, and what a set was worth

Saving a set starts the rest the programme implies — three minutes after heavy
compound work, two after everything else compound, ninety seconds after
isolation — and holds a screen wake lock for exactly as long as it runs, so a
phone does not have to be unlocked with chalk on your hands. The clock is an
end timestamp rather than a counter, so a locked screen or a backgrounded tab
comes back to the right number. Skip and +30s are always there.

Underneath each exercise is its estimated one-rep max, Epley, and the best in
the loaded history when today is not it. It exists because a set is two
numbers and progress is one: 8 × 60 kg and 5 × 70 kg are the same effort, and
nothing else in the app can say so. A single is reported as itself, and a set
above twelve reps gets no estimate rather than a confident wrong one.

## Importing a training history

Fitness accepts a CSV export from Strong or Hevy — or any file with a date, an
exercise name, reps and a weight — and turns it into logged sets, so "last
time" and every estimate work from day one instead of after six weeks.

It reads the file and shows what it found before it writes anything: the
exercises it matched and how many sets each has, every name nothing here
answers to, and every row it would drop with the reason. Names match across
word order and equipment qualifiers, so "Bench Press (Barbell)" finds Orbit's
own barbell bench press; a name that could mean two different lifts matches
neither, and warm-up sets are left out. Importing the same file twice changes
nothing, and an import never removes history that is already here.

## Applying migrations

The Supabase GitHub integration applies migrations to production on merge to
`main`. Nothing in this repository needs a database password, and no workflow
here touches the database.

Applying one by hand is the same command it always was:

```bash
npx supabase link --project-ref <ref>
npx supabase db push
```

If the CLI reports **"Remote migration versions not found in local migrations
directory"**, the record and the files have drifted apart rather than the
schema being wrong. `supabase_migrations.schema_migrations` is an ordinary
table: read it, compare its versions with the file names here, and reconcile
the record — never the schema — from the SQL editor.

## Daily rings

Today is shown as three activity rings — tasks, fitness, finance — in the Apple
Fitness idiom: they fill from empty on every visit, keep sweeping past the goal,
and the card states how many rings are closed. Ring geometry lives in
`src/lib/activity-rings.ts`.

## Momentum

Orbit tracks daily momentum as orbital altitude instead of a streak counter:
each day either lifts the orbit or lets it decay by 15 %. The Overview shows
the current tier, the exact score needed today to hold it, days in orbit, and a
running race against the same week seven days ago. The day can be exported as a
shareable PNG rendered entirely on the device. The mechanics and formulas are
documented in `docs/MOMENTUM.md`.

## Crew

A private circle, joined only by a code someone gives you: no search, no
directory, nothing public. A crew member sees a published day — score,
altitude, tier, run and rings closed — and never a task, a session, or a
number with a currency on it. The page carries this week's table, a fortnight
of days, and three one-tap reactions. An account with nobody in its crew
publishes nothing at all. The model, the policies and the guarantees are
documented in `docs/CREW.md`.

## Install on a phone

Orbit ships a web manifest and icons, so it installs as a standalone app:

1. Open the deployment in Safari or Chrome on the phone.
2. Choose Share → Add to Home Screen (iOS) or Install app (Android).
3. Launch it from the home screen; it opens without browser chrome.

## Main workflows

- Tasks can be created, edited, completed, reopened, archived, and restored.
  Completion history is retained.
- Fitness separates the reusable weekday plan from dated training results.
- Finance accepts text-based monthly EUR bank-statement PDFs for an in-memory
  preview. Orbit stores only confirmed normalized transactions and a
  non-reversible duplicate fingerprint; it does not persist the source PDF or
  extracted text.
- Finance data can be exported as CSV. Formula-leading text is neutralized for
  safer spreadsheet opening.
- Clearing Finance archives transactions and statement summaries atomically and
  offers immediate undo.

PDF statements are limited to 4 MB, 40 pages, and 500 detected transactions.
Scanned/image-only and password-protected PDFs are not supported.

## Verification

Run the complete local baseline:

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
npm audit --omit=dev
```

After deployment, verify:

1. Sign-up, optional email confirmation, login, logout, and protected redirects.
2. Task create/edit/complete/reopen/archive/undo.
3. Fitness plan edits and detailed training logs.
4. PDF preview, repeated rows, full-ledger review, import, and duplicate rejection.
5. Finance CSV export and archive/undo.
6. Overview preferences and weekly-reflection persistence.
7. Keyboard navigation, reduced motion, 200% zoom, and supported mobile widths.
8. Momentum card: altitude, tier, hold score, days in orbit, ghost race, and
   day-card export on a phone.

## Vercel deployment

1. Import the repository into Vercel.
2. configure `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
3. Deploy and add the final deployment URL to Supabase Auth.
4. Run the verification baseline and authenticated browser flows against the
   production deployment.

Do not deploy while `npm audit --omit=dev` reports a vulnerability affecting the
installed Next.js version.
