# Orbit layouts

Root composition:

```tsx
// src/app/layout.tsx
<html lang="en">
  <body>{children}</body>
</html>
```

Authenticated routes share `AppNavigation`, which renders desktop rail, mobile
safe-area navigation, global Quick Add, and `ProfileMenu`. Page content uses:

```tsx
<main className="app-shell">
  <div className="page-container">…</div>
</main>
```

`ProfileMenu` is a native `<dialog>` anchored as a phone bottom sheet and as a
bounded desktop panel. It contains account identity, dashboard settings, data
export, and logout. Overlay surfaces must trap focus, restore focus, support
Escape, and prevent accidental loss of dirty data.

Breakpoints:

- 320–430px: bottom navigation, full-width sheets, one-column forms.
- 768px+: navigation rail and anchored settings/command overlays.
- 1024–1440px: bounded content with route-specific working layouts.
