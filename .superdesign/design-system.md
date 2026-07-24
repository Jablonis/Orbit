# Orbit Priority 2 design contract

Build on the current Orbit system documented in `docs/UI_SYSTEM.md`.

The Priority 2 work covers four connected trust moments:

1. Settings dismissal: when data is dirty, replace the dialog body with a clear
   alert state titled “Discard unsaved changes?” Actions are “Keep editing”
   (primary) and “Discard changes” (danger). Escape, backdrop, close, download,
   and logout all pass through the same guard.
2. Quick Add search failure: keep local commands visible and typed text intact.
   Place a compact inline error immediately below search with a Retry control.
   Empty search and unavailable search must look and read differently.
3. Account recovery: use one-column, password-manager-friendly forms matching
   Login. Use explicit sent, expired-link, validation, and success states.
4. Fitness setup: before any plan exists, show a factual setup surface asking
   goal, experience, equipment, available days, session length, and exercises
   to avoid. Clearly label preselected values as reviewed starter defaults.
   Confirmation creates the plan; the same choices remain editable later.

Responsive rules:

- 320px: labels wrap, controls stay at least 44px, day/equipment choices reflow
  without page overflow, and dialog actions stack.
- 768px+: related settings may use two columns; consequence copy remains next
  to the action it explains.
- Feedback uses semantic text plus icon/heading, never position or color alone.
- Pending actions preserve layout and announce `aria-busy`.
