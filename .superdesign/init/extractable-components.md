# Extractable component inventory

Already canonical:

- semantic form and surface primitives in `src/components/ui/Primitives.tsx`
- `ActionToast`, `ConfirmDialog`, `EmptyState`, `PendingSubmitButton`
- `AppNavigation`, `ProfileMenu`, `QuickAdd`

Priority 2 extraction targets:

- `SettingsDirtyStateProvider` — shares dirty state between the embedded
  customizer and profile dialog dismissal paths.
- `FitnessSetupForm` — explicit, reusable initial/edit setup state.
- auth return-path validator — shared by Proxy, login, and callback.
- recovery form states — focused login-system components rather than additions
  to the dashboard shell.

Avoid wrapper-only components. Extract only state or behavior that has one
stable responsibility and can be tested independently.
