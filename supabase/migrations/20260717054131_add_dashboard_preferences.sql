alter table public.profiles
  add column if not exists dashboard_preferences jsonb not null default '{
    "cardOrder": ["rings", "fitness", "finance", "tasks", "analytics", "review"],
    "hiddenCards": [],
    "density": "comfortable",
    "rangeDays": 7,
    "pinnedTaskCategory": "",
    "pinnedFinanceMetric": "balance"
  }'::jsonb;

alter table public.profiles
  drop constraint if exists profiles_dashboard_preferences_object_check,
  add constraint profiles_dashboard_preferences_object_check
    check (jsonb_typeof(dashboard_preferences) = 'object');
