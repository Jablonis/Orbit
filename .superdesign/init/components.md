# Orbit shared components

Canonical UI implementation:

- `src/components/ui/Primitives.tsx` — semantic `Surface`, `PageHeader`,
  `Button`, `ButtonLink`, `IconButton`, `Field`, `Input`, `Select`, `Textarea`,
  segmented controls, badges, metrics, table shells, feedback, and skeletons.
- `src/components/ActionToast.tsx` — viewport-level, safe-area-aware feedback.
- `src/components/ConfirmDialog.tsx` — native modal confirmation with pending
  and error states.
- `src/components/EmptyState.tsx` — actionable empty-state pattern.
- `src/components/PendingSubmitButton.tsx` — Server Action pending state.

Shared component contract:

```tsx
<Surface tone="primary | secondary | hero | overlay" />
<Field label="Visible label" description="Optional guidance">
  <Input | Select | Textarea />
</Field>
<Button tone="primary | secondary | danger" />
<InlineFeedback tone="info | success | error" />
```

All frequent controls use a 44px target. New work uses semantic surfaces and
CSS variables from `src/app/globals.css`; it does not introduce a new glass-card
or raw-color dialect.
