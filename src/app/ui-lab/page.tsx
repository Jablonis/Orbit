import type { Metadata } from "next";
import { AppNavigation } from "@/components/AppNavigation";
import { EmptyState } from "@/components/EmptyState";
import {
  Badge,
  Button,
  ButtonLink,
  Field,
  FilterChip,
  InlineFeedback,
  Input,
  ListRow,
  Metric,
  PageHeader,
  SegmentedControl,
  Select,
  Skeleton,
  Surface,
  TableShell,
  Textarea,
} from "@/components/ui/Primitives";
import { getAuthenticatedUser } from "@/lib/auth";
import { getDashboardPreferences } from "@/lib/preferences";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "UI lab",
  description: "Orbit component and interaction-state reference.",
};

export default async function UiLabPage() {
  const { supabase, user } = await getAuthenticatedUser();
  const preferences = await getDashboardPreferences(supabase, user.id);

  return (
    <main className="app-shell" id="main-content" tabIndex={-1}>
      <AppNavigation active={null} profile={preferences.regional} userEmail={user.email ?? "Orbit user"} />
      <div className="page-container grid gap-8">
        <PageHeader
          action={<ButtonLink href="/">Back to Overview</ButtonLink>}
          description="A protected reference for Orbit’s reusable visual roles, interaction states, content limits, and responsive behavior."
          eyebrow="Internal reference"
          title="Orbit UI lab"
        />

        <section aria-labelledby="surfaces-heading" className="grid gap-4">
          <div>
            <p className="label-caps text-[var(--accent-focus)]">Foundations</p>
            <h2 className="card-title mt-2" id="surfaces-heading">
              Surface hierarchy
            </h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-4">
            <Surface className="p-5" tone="hero">
              <p className="label-caps text-[var(--accent-primary)]">Hero</p>
              <p className="body-copy mt-2 text-[var(--text-secondary)]">
                One route-level state or decision.
              </p>
            </Surface>
            <Surface className="p-5">
              <p className="label-caps text-[var(--accent-info)]">Primary</p>
              <p className="body-copy mt-2 text-[var(--text-secondary)]">
                Main working content and evidence.
              </p>
            </Surface>
            <Surface className="p-5" tone="secondary">
              <p className="label-caps text-[var(--text-tertiary)]">Secondary</p>
              <p className="body-copy mt-2 text-[var(--text-secondary)]">
                Rows, inset details, and supporting controls.
              </p>
            </Surface>
            <Surface className="p-5" tone="overlay">
              <p className="label-caps text-[var(--accent-highlight)]">Overlay</p>
              <p className="body-copy mt-2 text-[var(--text-secondary)]">
                Dialogs, command surfaces, and transient focus.
              </p>
            </Surface>
          </div>
        </section>

        <section aria-labelledby="controls-heading" className="surface-primary grid gap-6 p-5 sm:p-6">
          <div>
            <p className="label-caps text-[var(--accent-primary)]">Controls</p>
            <h2 className="card-title mt-2" id="controls-heading">
              Actions and selection
            </h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button tone="primary">Primary action</Button>
            <Button>Secondary action</Button>
            <Button tone="danger">Destructive action</Button>
            <Button disabled>Disabled action</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge>Default badge</Badge>
            <Badge className="border-[var(--accent-primary)] text-[var(--text-primary)]">
              Complete
            </Badge>
            <FilterChip active>Today</FilterChip>
            <FilterChip>Upcoming</FilterChip>
          </div>
          <SegmentedControl
            activeHref="/ui-lab"
            items={[
              { href: "/ui-lab", label: "Daily" },
              { href: "/ui-lab?view=weekly", label: "Weekly" },
            ]}
            label="Example period"
          />
        </section>

        <section aria-labelledby="forms-heading" className="grid gap-4 lg:grid-cols-2">
          <Surface className="grid gap-4 p-5 sm:p-6">
            <div>
              <p className="label-caps text-[var(--accent-info)]">Forms</p>
              <h2 className="card-title mt-2" id="forms-heading">
                Fields and guidance
              </h2>
            </div>
            <Field
              description="Essential guidance stays at or above the metadata floor."
              label="Task title"
            >
              <Input placeholder="Prepare the weekly review" />
            </Field>
            <Field label="Category">
              <Select defaultValue="work">
                <option value="work">Work</option>
                <option value="personal">Personal</option>
              </Select>
            </Field>
            <Field label="Note">
              <Textarea placeholder="Add useful context…" />
            </Field>
          </Surface>

          <Surface className="grid content-start gap-4 p-5 sm:p-6">
            <div>
              <p className="label-caps text-[var(--accent-highlight)]">Feedback</p>
              <h2 className="card-title mt-2">System states</h2>
            </div>
            <InlineFeedback>Data is ready to review.</InlineFeedback>
            <InlineFeedback tone="success">Your changes were saved.</InlineFeedback>
            <InlineFeedback tone="error">
              The change could not be saved. Try again.
            </InlineFeedback>
            <div className="grid gap-3" aria-label="Loading example" aria-busy="true">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-10 w-full" />
              <span className="sr-only">Loading example content</span>
            </div>
          </Surface>
        </section>

        <section aria-labelledby="data-heading" className="grid gap-4">
          <div>
            <p className="label-caps text-[var(--accent-focus)]">Data</p>
            <h2 className="card-title mt-2" id="data-heading">
              Metrics, rows, and tables
            </h2>
          </div>
          <dl className="surface-primary grid gap-5 p-5 sm:grid-cols-3 sm:p-6">
            <Metric detail="Of 8 active tasks" label="Completed" value="5" />
            <Metric detail="User-selected period" label="Focus" value="120 min" />
            <Metric detail="Imported July records" label="Cashflow" value="€840.20" />
          </dl>
          <ListRow
            action={<Button>Review</Button>}
            title="A deliberately long record title that demonstrates wrapping without hiding the primary action"
          >
            Secondary metadata wraps and remains readable at narrow widths.
          </ListRow>
          <TableShell label="Example finance records">
            <table className="ui-table">
              <thead>
                <tr>
                  <th scope="col">Description</th>
                  <th scope="col">Period</th>
                  <th scope="col">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Monthly statement import</td>
                  <td>July 2026</td>
                  <td className="metric-value">€840.20</td>
                </tr>
                <tr>
                  <td>Long merchant or source description remains available</td>
                  <td>June 2026</td>
                  <td className="metric-value">−€129.99</td>
                </tr>
              </tbody>
            </table>
          </TableShell>
          <EmptyState
            actionHref="/tasks#new-task"
            actionLabel="Create a task"
            description="Empty states say what is missing and provide the next valid action."
            title="No records in this view"
          />
        </section>
      </div>
    </main>
  );
}
