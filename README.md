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
- composite ownership constraints and a private statement-upload rate limit.

All exposed user tables use RLS. Application reads also filter by the
authenticated user.

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

## Vercel deployment

1. Import the repository into Vercel.
2. configure `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
3. Deploy and add the final deployment URL to Supabase Auth.
4. Run the verification baseline and authenticated browser flows against the
   production deployment.

Do not deploy while `npm audit --omit=dev` reports a vulnerability affecting the
installed Next.js version.
