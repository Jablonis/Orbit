# Building with the Orbit design system

Orbit is a personal dashboard: tasks, fitness, finance, and a "voyage" that turns
distance travelled into progress. Its current look is **Bloom** — a warm paper
canvas, one plum accent, and one soft tint per domain used as the container itself
instead of a bordered card.

## Setup

No provider and no theme context. Every component is a plain function that reads
CSS custom properties, so importing and rendering is all that is required.

Light is the default. Dark is a full second palette, switched by stamping the root
element — `<html data-theme="dark">`; with no stamp the stylesheet answers
`prefers-color-scheme` itself. Build for light and dark follows automatically,
because every colour below is a token rather than a hex value.

## The styling idiom

Tailwind v4 utilities bound to **semantic tokens**. Never write a raw colour: a hex
or a stock palette class like `bg-slate-500` breaks the theme switch. These families
are the vocabulary, and every name here is present in the shipped stylesheet:

| Job | Classes |
|---|---|
| Page ground and ink | `bg-background`, `text-foreground` |
| Card surface | `bg-card`, `text-card-foreground`, `shadow-[var(--shadow-card)]` |
| Recessed / secondary | `bg-muted`, `text-muted-foreground`, `bg-secondary`, `bg-accent` |
| Action | `bg-primary`, `text-primary-foreground` |
| Danger | `bg-destructive`, `text-destructive` |
| Lines and focus | `border-border`, `border-input`, `border-primary`, `ring-border` |
| Domain tint (containers) | `bg-tasks-tint`, `bg-fitness-tint`, `bg-finance-tint`, `bg-plum-tint` |
| Domain ink (text on a tint) | `text-tasks-ink`, `text-fitness-ink`, `text-finance-ink`, `text-plum-ink` |
| Domain solid (dots, bars) | `bg-tasks`, `bg-fitness`, `bg-finance`, `bg-plum` |
| Radius | `rounded-sm`, `rounded-xl`, `rounded-2xl`, `rounded-full` |

Prefer `<TintPanel system="fitness">` over hand-building a tint container — the raw
`bg-*-tint` classes are for the cases TintPanel cannot cover. Chart series are
tokens rather than classes: `var(--chart-1)` … `var(--chart-5)`.

Typography is named classes, not utility stacks:

- `label-caps` — the 12.5px semibold label above a reading. Used constantly.
- `code-caps` — uppercase mono, for an actual code or identifier. Rare on purpose.
- `display-figure` / `display-mega` — the large figure a card exists to show.
- `metric-value` — a figure inside a denser card.
- `settle-in` with `settle-1`…`settle-4` — the staggered entrance cards use.

## One important limit

The stylesheet here is **statically compiled** from Orbit's own source, so it holds
only the utilities Orbit already uses. A class that looks reasonable but appears
nowhere in the app — `text-fitness`, `rounded-md`, `bg-slate-100` — is simply absent
and renders as nothing. Stay inside the names above; for anything else use an inline
style with a token, e.g. `style={{ color: "var(--fitness)" }}`.

## Where the truth is

Read `styles.css` and its imports for the complete token set — every `--tasks-*`,
`--fitness-*`, `--finance-*` and `--plum-*`, the radii and the shadows, in both
palettes — and each component's `.prompt.md` and `.d.ts` for its real props.

## An idiomatic panel

```jsx
<TintPanel className="flex flex-col gap-5" system="fitness">
  <div className="flex items-start justify-between gap-3">
    <div className="min-w-0">
      <p className="label-caps text-muted-foreground">Fitness</p>
      <p className="mt-1.5 text-[20px] font-bold leading-7">Upper body</p>
      <p className="mt-1 text-[13px] text-muted-foreground">48 minutes, this evening.</p>
    </div>
    <Badge variant="fitness">On track</Badge>
  </div>
  <Progress indicatorClassName="bg-fitness-ink" value={50} />
  <div className="flex items-center gap-2">
    <Button className="flex-1">Start session</Button>
    <Button className="flex-1" variant="outline">Reschedule</Button>
  </div>
</TintPanel>
```
