# Orbit

Orbit is a Next.js 16 authenticated dashboard for tasks, fitness planning and finance tracking. Dashboard routes are protected by Supabase Auth and user data is stored in Supabase with RLS.

## Local Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. Logged-out users are redirected to `/login`.

Create `.env.local` with:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

`NEXT_PUBLIC_SUPABASE_ANON_KEY` is also supported as a fallback for older Supabase projects. Do not put a service role key in client-visible env vars.

## Supabase Setup

1. Create a Supabase project.
2. Enable Email/Password in Authentication.
3. Apply the SQL migration in `supabase/migrations/20260715120000_create_orbit_app_schema.sql`.
4. In Auth URL configuration, add your local URL and Vercel production URL.

The migration creates:

- `profiles`
- `tasks`
- `fitness_weekly_plan`
- `finance_transactions`

RLS is enabled for all user-owned tables. Policies use `TO authenticated` with `auth.uid()` ownership checks, including `USING` and `WITH CHECK` for updates.

Apply migrations with the Supabase CLI if available:

```bash
supabase link --project-ref your-project-ref
supabase db push
```

Or paste the migration SQL into the Supabase SQL editor.

## Finance CSV

Import headers:

```csv
date,title,category,amount,status
```

Rules:

- `date` must be `YYYY-MM-DD`
- `amount` is positive for income and negative for expenses
- `status` is `paid`, `pending` or `scheduled`
- missing status defaults to `paid`
- valid rows are imported even when other rows are invalid

The finance page also supports CSV export, sample CSV download and clearing finance data for the logged-in user.

## Vercel Deployment

1. Push the repository to GitHub.
2. Import the project in Vercel.
3. Add environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

Use `NEXT_PUBLIC_SUPABASE_ANON_KEY` only if your Supabase project still uses anon-key naming.

4. Deploy.
5. Add the Vercel deployment URL to Supabase Auth redirect/site URL settings.

## Verification

```bash
npm run lint
npm run build
```

After deployment:

1. Visit `/login` and create an account.
2. Confirm logged-out users cannot access `/`, `/tasks`, `/fitness` or `/finance`.
3. Create, edit, complete and delete tasks.
4. Update the weekly fitness plan.
5. Import finance CSV data and export it again.
