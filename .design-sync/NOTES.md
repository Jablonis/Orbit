# design-sync notes for Orbit

Repo-specific things a future sync should know. Config lives in `config.json`;
this file holds everything that isn't a config field.

## Shape

Orbit is a Next.js application, not a published component package, so there is no
`dist/` to convert. `.design-sync/` acts as a small sync-only wrapper package:

- `ds-entry.ts` is the **bundle entry** and the definition of the design-system
  surface. Adding a module here publishes it; that is the only place the component
  set is decided.
- `types-entry.d.ts` + the generated `dist/` tree give the converter an
  authoritative `.d.ts` to extract prop contracts from. `package.json` in this
  directory exists purely so the converter can resolve `pkg` and `types`; it is not
  installed, published, or part of the app build.
- The full converter invocation is:

  ```
  node .ds-sync/package-build.mjs --config .design-sync/config.json \
    --node-modules ./node_modules --entry .design-sync/ds-entry.ts --out ./ds-bundle
  ```

  `--entry` is required — without it the converter looks for `node_modules/orbit-design-system`.

## Scope: the v2 set, not Primitives.tsx

`src/components/ui/Primitives.tsx` is the **v1 design system and is dead code** —
nothing imports it except `src/app/ui-lab/page.tsx`. The live system is the
shadcn-style set (`button`, `card`, `badge`, `input`, `label`, `progress`,
`separator`, `skeleton`, `tint-panel`), used across ~11 app files. Do not sync
Primitives: its exports (`Button`, `Badge`, `Input`, `Skeleton`) collide with the
v2 names in a single bundle namespace. The rest of `src/components/` is app-coupled
(Supabase, server actions, Next router) and cannot be bundled for a browser.

## CSS must be compiled first

`src/app/globals.css` starts with `@import "tailwindcss"`, which no browser can
resolve, so `cssEntry` points at a **compiled** stylesheet built by `buildCmd`.
Run `buildCmd` before the converter on every sync — it also regenerates the `.d.ts`
tree. The Tailwind CLI is invoked as `@tailwindcss/cli@4` via npx because the repo
depends on `@tailwindcss/postcss` rather than the standalone CLI.

## Fonts

The app loads Figtree and DM Mono through `next/font/google`, which injects
`--font-figtree` / `--font-dm-mono` at runtime. A rendered design has no Next.js
runtime, so both the faces and the variables must ship:

- `fonts/fonts.css` (+ the three `.woff2` files) declares the faces, wired through
  `cfg.extraFonts`. These are the same upstream Google fonts, vendored from
  `@fontsource-variable/figtree` and `@fontsource/dm-mono` so nothing loads remotely.
- **The font pass ships `@font-face` rules and silently drops everything else**, so
  the two `--font-*` variables live in `font-vars.css`, which `buildCmd` appends to
  the compiled stylesheet. Without that append the fonts ship but nothing points at
  them, and every design renders in a system fallback that no check catches.
- `cfg.tokensGlob` cannot carry these: `copyTokens` is a no-op unless `tokensPkg`
  names a package inside `node_modules`.

## Known render warns

Triaged and expected — a re-sync should not treat these as new:

- `[TOKENS_MISSING]` for `--quick-add-top`, `--quick-add-left`, `--arc`, `--arc-end`,
  `--ring-length`, `--climb-y`, `--climb-x`. These are set at runtime as inline
  styles by app components (QuickAdd, ActivityRings, ClimbCurve), never by a
  stylesheet, and none belong to a synced component.
- `[TOKENS_MISSING]` for `--font-geist-mono`. This one is a **real but pre-existing
  app bug**, not a sync artifact: `src/app/welcome/page.tsx:384` still references the
  Geist mono variable, but the app switched to DM Mono and no longer loads Geist, so
  that line already falls back in production. Fixing it belongs in the app, not here.
- `[DOCS_UNMAPPED]` for all 17 components — Orbit has no per-component docs, so the
  `.prompt.md` files are synthesized from the `.d.ts` plus the authored previews.
  Setting `cfg.docsDir` later would improve them.

## Previews

All 17 components have authored previews in `previews/`, graded good. Composition
was ported from real app usage (`src/components/overview/cards.tsx`,
`VoyageCard.tsx`, `src/app/welcome/page.tsx`) rather than invented.

`Label`'s `WithCheckbox` cell renders a browser-default checkbox on purpose: the DS
has no Checkbox component, the app pairs `Label` with raw checkboxes, and
`globals.css:1155` deliberately excludes checkbox/radio/range from the field shell.

## Re-sync risks

- **The compiled stylesheet is a JIT snapshot.** It contains only the utilities
  Orbit's source already uses, so the vocabulary available to designs changes
  whenever app code changes. `conventions.md` enumerates specific class names —
  re-validate them against the fresh build on every sync and fix any that stop
  resolving. Known already-absent examples: `text-fitness`, `rounded-md`.
- **`ds-entry.ts` will drift.** A component added to `src/components/ui/` does not
  appear in the design system until it is added to `ds-entry.ts` *and*
  `tsconfig.dts.json`'s `include` list. Both are manual.
- The Tailwind CLI is pinned only to major 4 (`@tailwindcss/cli@4`), so a future
  patch release could change the compiled output.
- `dist/`, `.cache/` and `ds-bundle/` are gitignored and regenerated; a fresh clone
  must run `buildCmd` before the converter.

## Why this directory doesn't break the app build

`.design-sync/previews/*.tsx` import `"orbit-design-system"`, which is not a real
entry in `node_modules` — so if TypeScript ever pulled those files into the app's
program they would fail with TS2307 and break `next build`. They don't, and the
reason is worth knowing before anyone renames anything: the app `tsconfig.json`
includes `**/*.tsx` and excludes only `node_modules`, but **TypeScript's `include`
globs skip dot-prefixed directories**, so a directory named `.design-sync` is never
walked. Verified: `npx tsc --noEmit` exits 0 and `--listFilesOnly` reports zero
preview files in the program.

The leading dot is therefore load-bearing. Renaming this directory to something
without it (`design-sync/`) would drag 17 unresolvable imports into the app build;
if that ever happens, add the new name to the app tsconfig's `exclude` array. The
converter is unaffected either way — it only reads `compilerOptions.paths`.
