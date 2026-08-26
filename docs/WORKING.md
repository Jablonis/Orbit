# Working on Orbit

The durable half of the working notes, kept in `docs/` because the repository
ignores `AGENTS.md` on purpose — that file is a personal, local one. A local
`AGENTS.md` can simply say `@docs/WORKING.md` and add whatever else is yours.

Orbit is a personal daily planner: tasks, fitness and finance, scored into one
day, and a momentum engine that models the day as orbital altitude. Next.js App
Router, React, strict TypeScript, Tailwind v4, Supabase with row-level security.

## Verify with what CI verifies

`.github/workflows` runs exactly this, in this order. Run all of it before
pushing — `npm test` alone has twice let a red build through:

```bash
npm run audit:prod && npm run lint && npx tsc --noEmit && npm test && npm run test:ui && npm run build
```

## Look at visual changes, do not assume them

Every visual change in this repository has been checked by rendering it, and
that is how the mistakes were found: a mascot that read as the wrong animal, a
helmet ruling a line through a body, an exhaust crossing a divider, a fifth
navigation item wrapping on a phone. The loop:

1. Add a temporary `src/app/preview/page.tsx` (`export const dynamic =
   "force-dynamic"`) that renders the real components with fixture props.
2. `npm run build`, then start the server in **its own process group**, keeping
   the group id:

   ```bash
   setsid bash -c 'echo $$ > /tmp/orbit-preview.pgid; exec npx next start -p 3300' \
     >/tmp/orbit-preview.log 2>&1 </dev/null &
   ```

   `setsid` matters twice: the group is not your shell's, so stopping it later
   cannot stop you, and `exec` keeps the group id the file just recorded.

3. Wait for it with curl's own retry — foreground `sleep` is blocked here, and a
   bare polling loop spins faster than the server starts:

   ```bash
   curl -s --retry 30 --retry-delay 1 --retry-connrefused -o /dev/null \
     -w "%{http_code}" http://localhost:3300/preview
   ```

4. Screenshot with Playwright, using the browser already on the machine —
   never `playwright install`:

   ```
   chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" })
   ```

   To inspect motion, freeze it: `document.getAnimations().forEach(a => a.pause())`.

5. Stop the whole group, and delete the preview route before committing:

   ```bash
   kill -- -"$(cat /tmp/orbit-preview.pgid)"
   ```

   Killing the pid that `npx` reports is not enough: `npx` spawns `next-server`
   as a child, which survives and keeps holding the port. That is what makes a
   session creep from port 3200 to 3211 — every "stopped" server is still up.

### Never `pkill -f` here

The agent harness runs each command as `bash -c '<your entire command text>'`,
so **your own command line is in `argv` of a live process**. `pkill -f "next
start"` therefore matches the shell running it and kills it mid-command: the
call dies with exit 144, the rest of the command never runs, and the server it
was meant to stop is often still alive. The bracket trick (`[n]ext start`) does
not save you either, because the pattern still matches the text of the command
you just typed.

Kill by PID, or stop the background task through the harness. Orphaned servers
are found with `ps -eo pid,args | grep "next-serve[r]"` and killed by number.

## Conventions this codebase already follows

- **Logic is pure and tested; components render it.** Engines live in
  `src/lib/*.ts` with a matching `tests/*.test.ts` and no I/O. If a rule is
  worth arguing about, it belongs in a lib with a test, not in JSX.
- **Derive, do not store.** Momentum, the recap, milestones, Pip's mood and the
  crew snapshot are all computed from data the page already loads. A second
  source of truth is a bug waiting to happen.
- **Supabase writes go through `security definer` functions** with a pinned
  `search_path`; tables have RLS on, are revoked from `anon` and `public`, and
  grant `select` only. Rows are keyed on `auth.uid()`, never on a client value.
- **A secret never goes in a `NEXT_PUBLIC_` variable.** The service-role key,
  the VAPID private key and the cron secret are server-side; only the public
  VAPID key is exposed.
- **Migrations are additive.** New tables, nothing existing read or rewritten,
  and dropping them restores the previous behaviour.
- **Motion**: `transform` and `opacity` only, curves from the token layer, under
  300 ms outside the two rare moments, and `prefers-reduced-motion` respected.
- Commits explain *why*, in prose. No `Co-Authored-By` lines.

## Where the thinking is written down

| Subject | File |
| --- | --- |
| Momentum, the recap, the share images | `docs/MOMENTUM.md` |
| The crew, and what it does not share | `docs/CREW.md` |
| Palette, type, Pip, the ascent | `docs/BRAND.md` |
| Tokens, components, the day's instrument | `docs/UI_SYSTEM.md` |
