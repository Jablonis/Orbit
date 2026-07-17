"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { ActionToast } from "@/components/ActionToast";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { PendingSubmitButton } from "@/components/PendingSubmitButton";
import {
  Task,
  TaskComplexity,
  TaskEstimateMode,
  TaskPriority,
  TaskType,
  formatTaskTime,
  getTaskDayStatus,
  taskComplexityLabels,
  taskPriorityLabels,
  taskTypeLabels,
} from "@/lib/tasks";
import {
  archiveTaskAction,
  restoreTaskAction,
  saveTaskAction,
  toggleTaskAction,
} from "./actions";

const typeOptions: TaskType[] = ["deep-work", "admin", "learning", "personal"];
const complexityOptions: TaskComplexity[] = ["easy", "medium", "hard"];
const priorityOptions: TaskPriority[] = ["low", "normal", "high"];
const estimateOptions: TaskEstimateMode[] = ["1hr", "2hr", "3hr", "other"];

export function TasksClient({
  categorySuggestions,
  stats,
  tasks,
  today,
}: {
  categorySuggestions: string[];
  stats: ReturnType<typeof import("@/lib/tasks").getTaskStats>;
  tasks: Task[];
  today: string;
}) {
  const [editing, setEditing] = useState<Task | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [archivedTaskId, setArchivedTaskId] = useState<string | null>(null);
  const displayTasks = tasks.filter((task) => task.id !== archivedTaskId);
  const activeTasks = displayTasks.filter((task) => !task.completed);
  const taskGroups = [
    { key: "overdue", label: "Overdue", tasks: displayTasks.filter((task) => getTaskDayStatus(task, today) === "overdue") },
    { key: "today", label: "Today", tasks: displayTasks.filter((task) => getTaskDayStatus(task, today) === "today") },
    { key: "scheduled", label: "Upcoming", tasks: displayTasks.filter((task) => getTaskDayStatus(task, today) === "scheduled") },
  ] as const;
  const completedTasks = displayTasks.filter(
    (task) => getTaskDayStatus(task, today) === "completed",
  );

  useEffect(() => {
    const openFromHash = () => {
      if (window.location.hash === "#new-task") {
        setEditing(null);
        setFormOpen(true);
      }
    };
    const frame = window.requestAnimationFrame(openFromHash);
    window.addEventListener("hashchange", openFromHash);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", openFromHash);
    };
  }, []);

  return (
    <section className="mx-auto w-full max-w-[1440px] px-4 py-8 md:px-10">
      <header className="mb-8 flex items-end justify-between gap-5 pr-14 md:pr-0">
        <div>
          <p className="label-caps text-[var(--accent-info)]">Task system</p>
          <h1 className="page-title mt-2 text-white">
            Today&apos;s work
          </h1>
          <p className="mt-3 max-w-2xl text-[14px] leading-6 text-[var(--text-secondary)]">
            Focus on what is due now. Unfinished work rolls forward; future work
            stays out of the way.
          </p>
        </div>
        <button
          className="hidden min-h-11 shrink-0 rounded-[var(--radius-control)] bg-[var(--accent-primary)] px-4 text-[13px] font-bold text-[#14200a] max-xl:block"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          type="button"
        >
          New task
        </button>
      </header>

      <section className="grid gap-6 xl:grid-cols-[390px_1fr]">
        {formOpen ? (
          <button
            aria-label="Close task form"
            className="fixed inset-0 z-[80] bg-black/65 backdrop-blur-[2px] xl:hidden"
            onClick={() => setFormOpen(false)}
            type="button"
          />
        ) : null}
        <aside
          className={`content-panel rounded-[var(--radius-panel)] p-5 sm:p-6 ${formOpen ? "fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[90] block max-h-[calc(100dvh-7rem)] overflow-y-auto" : "hidden"} xl:sticky xl:top-6 xl:block xl:max-h-none xl:self-start xl:overflow-visible`}
          id="new-task"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="label-caps text-[var(--text-secondary)]">{editing ? "Edit task" : "New task"}</p>
            <button
              aria-label="Close task form"
              className="grid h-11 w-11 place-items-center rounded-full border border-[var(--border-subtle)] text-[20px] text-[var(--text-secondary)] xl:hidden"
              onClick={() => setFormOpen(false)}
              type="button"
            >
              ×
            </button>
          </div>
          <form action={saveTaskAction} className="mt-5 grid gap-3" key={editing?.id ?? "new-task"}>
            <input name="id" type="hidden" value={editing?.id ?? ""} />
            <input name="completed" type="hidden" value={String(editing?.completed ?? false)} />
            <Field label="Title">
              <input
                className="field-input"
                defaultValue={editing?.title ?? ""}
                name="title"
                required
              />
            </Field>
            <Field label="Category">
              <input
                className="field-input"
                defaultValue={editing?.category ?? "Jadro"}
                list="task-category-suggestions"
                name="category"
                required
              />
              <datalist id="task-category-suggestions">
                {categorySuggestions.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
              {categorySuggestions.length > 0 ? (
                <span className="text-[11px] leading-4 text-[#8d9092]">
                  Type a new category or choose one of your most used suggestions.
                </span>
              ) : null}
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type">
                <select className="field-input" defaultValue={editing?.type ?? "deep-work"} name="type">
                  {typeOptions.map((value) => (
                    <option key={value} value={value}>
                      {taskTypeLabels[value]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Complexity">
                <select className="field-input" defaultValue={editing?.complexity ?? "medium"} name="complexity">
                  {complexityOptions.map((value) => (
                    <option key={value} value={value}>
                      {taskComplexityLabels[value]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Priority">
                <select className="field-input" defaultValue={editing?.priority ?? "normal"} name="priority">
                  {priorityOptions.map((value) => (
                    <option key={value} value={value}>
                      {taskPriorityLabels[value]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Estimate">
                <select className="field-input" defaultValue={editing?.estimateMode ?? "1hr"} name="estimateMode">
                  {estimateOptions.map((value) => (
                    <option key={value} value={value}>
                      {value === "other" ? "Custom" : value}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="From">
                <input className="field-input" defaultValue={editing?.timeFrom ?? ""} name="timeFrom" type="time" />
              </Field>
              <Field label="To">
                <input className="field-input" defaultValue={editing?.timeTo ?? ""} name="timeTo" type="time" />
              </Field>
              <Field label="Due">
                <input className="field-input" defaultValue={editing?.dueDate ?? ""} name="dueDate" type="date" />
              </Field>
            </div>
            <Field label="Note">
              <textarea
                className="field-input min-h-24 py-3"
                defaultValue={editing?.note ?? ""}
                name="note"
              />
            </Field>
            <div className="flex gap-3">
              <PendingSubmitButton
                className="flex-1 rounded-[14px] bg-white px-4 py-3 text-[13px] font-semibold text-[#202020]"
                pendingLabel={editing ? "Saving…" : "Creating…"}
              >
                {editing ? "Save changes" : "Create task"}
              </PendingSubmitButton>
              {editing ? (
                <button
                  className="rounded-[14px] border border-white/10 bg-[#201f1f] px-4 py-3 text-[13px] font-semibold text-[#c4c7c8]"
                  onClick={() => {
                    setEditing(null);
                    setFormOpen(false);
                  }}
                  type="button"
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        </aside>

        <section className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-4">
            <Metric label="Active" value={stats.activeTasksCount} tone="text-white" />
            <Metric label="Done" value={stats.completedTasksCount} tone="text-[#a3e635]" />
            <Metric label="Hard" value={stats.hardTasksCount} tone="text-[#f59e0b]" />
            <Metric label="Focus min" value={stats.totalEstimateMinutes} tone="text-[#60a5fa]" />
          </div>
          <div className="content-panel rounded-[var(--radius-panel)] p-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="label-caps text-[var(--text-secondary)]">Active queue</p>
                <h2 className="mt-2 text-[24px] font-semibold text-white">
                  {activeTasks.length} open tasks
                </h2>
              </div>
              <span className="rounded-full bg-[#a3e635]/12 px-3 py-1 text-[12px] font-semibold text-[#d9f99d]">
                {stats.completionPercent}% done
              </span>
            </div>
            <div className="grid gap-6">
              {taskGroups.map((group) => group.tasks.length > 0 ? (
                <section aria-labelledby={`task-group-${group.key}`} key={group.key}>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-[13px] font-semibold text-white" id={`task-group-${group.key}`}>{group.label}</h3>
                    <span className="metric-value text-[11px] text-[var(--text-tertiary)]">{group.tasks.length}</span>
                  </div>
                  <div className="grid gap-3">
                    {group.tasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        onArchived={() => setArchivedTaskId(task.id)}
                        onEdit={() => {
                          setEditing(task);
                          setFormOpen(true);
                        }}
                        task={task}
                        today={today}
                      />
                    ))}
                  </div>
                </section>
              ) : null)}

              {activeTasks.length === 0 ? (
                <EmptyState
                  action={(
                    <button
                      className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] border border-[var(--border-strong)] bg-white/[0.045] px-4 text-[12px] font-semibold text-white"
                      onClick={() => {
                        setEditing(null);
                        setFormOpen(true);
                      }}
                      type="button"
                    >
                      Add a task
                    </button>
                  )}
                  description="Plan only work that deserves a place in today or the days ahead."
                  icon="✓"
                  title="Your active queue is clear"
                />
              ) : null}

              {completedTasks.length > 0 ? (
                <details className="border-t border-[var(--border-subtle)] pt-4">
                  <summary className="cursor-pointer text-[13px] font-semibold text-[var(--text-secondary)]">
                    Completed today · {completedTasks.length}
                  </summary>
                  <div className="mt-3 grid gap-3">
                    {completedTasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        onArchived={() => setArchivedTaskId(task.id)}
                        onEdit={() => {
                          setEditing(task);
                          setFormOpen(true);
                        }}
                        task={task}
                        today={today}
                      />
                    ))}
                  </div>
                </details>
              ) : null}
            </div>
          </div>
        </section>
      </section>
      {archivedTaskId ? (
        <ActionToast
          action={(
            <button
              className="min-h-11 shrink-0 px-2 font-bold text-[var(--accent-primary)]"
              onClick={async () => {
                const result = await restoreTaskAction(archivedTaskId);
                if (result.ok) setArchivedTaskId(null);
              }}
              type="button"
            >
              Undo
            </button>
          )}
          message="Task archived."
        />
      ) : null}
    </section>
  );
}

function TaskRow({
  onArchived,
  onEdit,
  task,
  today,
}: {
  onArchived: () => void;
  onEdit: () => void;
  task: Task;
  today: string;
}) {
  const dayStatus = getTaskDayStatus(task, today);
  const tone = taskDayTones[dayStatus];

  return (
    <article className={`task-state-enter group grid gap-4 rounded-[var(--radius-row)] border p-4 lg:grid-cols-[1fr_auto] ${tone.card}`}>
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-3">
          <h4 className={`min-w-0 text-[16px] font-semibold leading-6 ${tone.title}`}>
            {task.title}
          </h4>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${tone.badge}`}>
            {tone.label}
          </span>
        </div>
        <p className="mt-2 text-[12px] leading-[18px] text-[var(--text-secondary)]">
          {task.category} · {formatTaskTime(task)} · {taskComplexityLabels[task.complexity]} · {taskPriorityLabels[task.priority]}
          {task.dueDate ? ` · due ${task.dueDate}` : ""}
        </p>
        {task.note ? (
          <p className="mt-2 line-clamp-2 text-[12px] leading-[18px] text-[var(--text-tertiary)]">{task.note}</p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
        <form action={toggleTaskAction}>
          <input name="id" type="hidden" value={task.id} />
          <input name="completed" type="hidden" value={String(!task.completed)} />
          <PendingSubmitButton
            ariaLabel={task.completed ? "Reopen task" : "Complete task"}
            className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border-strong)] bg-[var(--surface-hover)] px-3 text-[12px] font-semibold text-white"
            pendingLabel="Saving…"
          >
            {task.completed ? "Reopen" : "Done"}
          </PendingSubmitButton>
        </form>
        <div className="flex gap-2 opacity-100 transition duration-150 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
          <button
            className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border-subtle)] px-3 text-[12px] font-semibold text-[var(--text-secondary)]"
            onClick={onEdit}
            type="button"
          >
            Edit
          </button>
          <ConfirmDialog
            confirmLabel="Archive task"
            description={`“${task.title}” will leave your active task list. Its completion history remains intact, and you can undo this action.`}
            onConfirm={() => {
              const formData = new FormData();
              formData.set("id", task.id);
              return archiveTaskAction(formData);
            }}
            onSuccess={onArchived}
            title="Archive this task?"
            triggerClassName="min-h-11 rounded-[var(--radius-control)] border border-[#ff8a80]/25 bg-[#ff8a80]/10 px-3 text-[12px] font-semibold text-[#ffd7d3]"
            triggerLabel="Archive"
          />
        </div>
      </div>
    </article>
  );
}

const taskDayTones = {
  completed: {
    badge: "bg-[#a3e635]/12 text-[#d9f99d]",
    card: "border-[#a3e635]/15 bg-[#a3e635]/[0.04]",
    label: "Done today",
    title: "text-[#8d9092] line-through",
  },
  overdue: {
    badge: "bg-[#ff8a80]/15 text-[#ffd7d3]",
    card: "border-[#ff8a80]/35 bg-[#ff8a80]/[0.08]",
    label: "Rolled over",
    title: "text-[var(--danger)]",
  },
  scheduled: {
    badge: "bg-[#60a5fa]/15 text-[#bfdbfe]",
    card: "border-[#60a5fa]/35 bg-[#60a5fa]/[0.08]",
    label: "Scheduled",
    title: "text-[#dbeafe]",
  },
  today: {
    badge: "bg-white/[0.07] text-[#c4c7c8]",
    card: "border-white/10 bg-[#201f1f]/55",
    label: "Today",
    title: "text-white",
  },
} as const;

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="grid gap-2">
      <span className="label-caps text-[#c4c7c8]">{label}</span>
      {children}
    </label>
  );
}

function Metric({ label, tone, value }: { label: string; tone: string; value: number }) {
  return (
    <article className="content-panel rounded-[var(--radius-row)] p-4">
      <p className="label-caps text-[var(--text-secondary)]">{label}</p>
      <p className={`metric-value mt-3 text-[28px] font-semibold ${tone}`}>{value}</p>
    </article>
  );
}
