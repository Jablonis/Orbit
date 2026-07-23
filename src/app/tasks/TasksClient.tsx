"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
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
  formatRelativeTaskDate,
  getTaskDayStatus,
  taskComplexityLabels,
  taskPriorityLabels,
  taskTypeLabels,
} from "@/lib/tasks";
import {
  archiveTaskAction,
  bulkUpdateTasksAction,
  restoreTaskAction,
  saveTaskAction,
  toggleTaskAction,
} from "./actions";

const typeOptions: TaskType[] = ["deep-work", "admin", "learning", "personal"];
const complexityOptions: TaskComplexity[] = ["easy", "medium", "hard"];
const priorityOptions: TaskPriority[] = ["low", "normal", "high"];
const estimateOptions: TaskEstimateMode[] = ["1hr", "2hr", "3hr", "other"];
const taskSortOptions = ["today", "due", "priority", "title"] as const;
const taskStatusOptions = ["all", "open", "done"] as const;
const taskDateOptions = ["all", "overdue", "today", "scheduled"] as const;
type TaskSort = (typeof taskSortOptions)[number];

export function TasksClient({
  archivedTasks,
  categorySuggestions,
  stats,
  tasks,
  today,
  locale,
}: {
  archivedTasks: Task[];
  categorySuggestions: string[];
  stats: ReturnType<typeof import("@/lib/tasks").getTaskStats>;
  tasks: Task[];
  today: string;
  locale: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [editing, setEditing] = useState<Task | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [archivedTaskId, setArchivedTaskId] = useState<string | null>(null);
  const [estimateMode, setEstimateMode] = useState<TaskEstimateMode>("1hr");
  const [formVersion, setFormVersion] = useState(0);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [bulkDate, setBulkDate] = useState(today);
  const [bulkPending, setBulkPending] = useState(false);
  const [taskSaveNotice, setTaskSaveNotice] = useState<{
    error: boolean;
    message: string;
  } | null>(null);
  const [undoError, setUndoError] = useState("");
  const [undoPending, setUndoPending] = useState(false);
  const formDialog = useRef<HTMLDialogElement>(null);
  const formTitleInput = useRef<HTMLInputElement>(null);
  const displayTasks = tasks.filter((task) => task.id !== archivedTaskId);
  const query = searchParams.get("q")?.trim().toLocaleLowerCase() ?? "";
  const status = valueFromOptions(
    searchParams.get("status"),
    taskStatusOptions,
    "all",
  );
  const dateFilter = valueFromOptions(
    searchParams.get("date"),
    taskDateOptions,
    "all",
  );
  const priority = valueFromOptions(
    searchParams.get("priority"),
    ["all", ...priorityOptions] as const,
    "all",
  );
  const type = valueFromOptions(
    searchParams.get("type"),
    ["all", ...typeOptions] as const,
    "all",
  );
  const sort = valueFromOptions(
    searchParams.get("sort"),
    taskSortOptions,
    "today",
  );
  const filtersActive =
    Boolean(query) ||
    status !== "all" ||
    dateFilter !== "all" ||
    priority !== "all" ||
    type !== "all" ||
    sort !== "today";
  const filteredTasks = sortTaskList(
    displayTasks.filter((task) => {
      const dayStatus = getTaskDayStatus(task, today);
      const searchable = `${task.title} ${task.category} ${task.note}`.toLocaleLowerCase();
      if (query && !searchable.includes(query)) return false;
      if (status === "open" && task.completed) return false;
      if (status === "done" && !task.completed) return false;
      if (dateFilter !== "all" && dayStatus !== dateFilter) return false;
      if (priority !== "all" && task.priority !== priority) return false;
      if (type !== "all" && task.type !== type) return false;
      return true;
    }),
    sort,
    today,
  );
  const activeTasks = filteredTasks.filter((task) => !task.completed);
  const taskGroups = [
    { key: "overdue", label: "Overdue", tasks: filteredTasks.filter((task) => getTaskDayStatus(task, today) === "overdue") },
    { key: "today", label: "Today", tasks: filteredTasks.filter((task) => getTaskDayStatus(task, today) === "today") },
    { key: "scheduled", label: "Upcoming", tasks: filteredTasks.filter((task) => getTaskDayStatus(task, today) === "scheduled") },
  ] as const;
  const completedTasks = filteredTasks.filter(
    (task) => getTaskDayStatus(task, today) === "completed",
  );
  const allVisibleSelected =
    filteredTasks.length > 0 &&
    filteredTasks.every((task) => selectedTaskIds.includes(task.id));

  async function runBulkAction(
    intent: Parameters<typeof bulkUpdateTasksAction>[1],
  ) {
    if (selectedTaskIds.length === 0 || bulkPending) return;
    setBulkPending(true);
    setTaskSaveNotice(null);
    try {
      const result = await bulkUpdateTasksAction(
        selectedTaskIds,
        intent,
        bulkDate,
      );
      if (result.ok) {
        setSelectedTaskIds([]);
        setTaskSaveNotice({
          error: false,
          message: `${result.updated} task${result.updated === 1 ? "" : "s"} updated.`,
        });
        router.refresh();
      } else {
        setTaskSaveNotice({ error: true, message: result.error });
      }
    } catch {
      setTaskSaveNotice({
        error: true,
        message: "The selected tasks could not be updated.",
      });
    } finally {
      setBulkPending(false);
    }
  }

  function toggleSelected(taskId: string) {
    setSelectedTaskIds((current) =>
      current.includes(taskId)
        ? current.filter((id) => id !== taskId)
        : [...current, taskId],
    );
  }

  function updateFilter(
    key: string,
    value: string,
    defaultValue = "all",
    replace = false,
  ) {
    const next = new URLSearchParams(searchParams.toString());
    if (!value || value === defaultValue) next.delete(key);
    else next.set(key, value);
    const href = next.size ? `${pathname}?${next.toString()}` : pathname;
    if (replace) window.history.replaceState(null, "", href);
    else window.history.pushState(null, "", href);
  }

  function clearFilters() {
    window.history.pushState(null, "", pathname);
  }

  useEffect(() => {
    const openFromHash = () => {
      if (window.location.hash === "#new-task") {
        setEditing(null);
        setEstimateMode("1hr");
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

  useEffect(() => {
    const node = formDialog.current;
    if (!node) return;
    const desktop = window.matchMedia("(min-width: 1280px)");
    let focusFrame = 0;

    const syncDialog = () => {
      if (desktop.matches) {
        if (node.matches(":modal")) node.close();
        if (!node.open) node.show();
        return;
      }

      if (formOpen) {
        if (node.open) node.close();
        node.showModal();
        window.cancelAnimationFrame(focusFrame);
        focusFrame = window.requestAnimationFrame(() =>
          formTitleInput.current?.focus(),
        );
      } else if (node.open) {
        node.close();
      }
    };

    syncDialog();
    desktop.addEventListener("change", syncDialog);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      desktop.removeEventListener("change", syncDialog);
    };
  }, [formOpen]);

  async function saveTask(formData: FormData) {
    setTaskSaveNotice(null);
    try {
      const result = await saveTaskAction(formData);
      if (!result.ok) {
        setTaskSaveNotice({ error: true, message: result.error });
        return;
      }
      setTaskSaveNotice({
        error: false,
        message: editing ? "Task updated." : "Task created.",
      });
      setEditing(null);
      setEstimateMode("1hr");
      setFormVersion((current) => current + 1);
      setFormOpen(false);
    } catch {
      setTaskSaveNotice({
        error: true,
        message: "The task could not be saved. Please try again.",
      });
    }
  }

  async function undoArchive() {
    if (!archivedTaskId || undoPending) return;
    setUndoPending(true);
    setUndoError("");
    try {
      const result = await restoreTaskAction(archivedTaskId);
      if (result.ok) {
        setArchivedTaskId(null);
        return;
      }
      setUndoError(result.error);
    } catch {
      setUndoError("The task could not be restored. Please try again.");
    } finally {
      setUndoPending(false);
    }
  }

  return (
    <section className="page-container py-8">
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
          className="hidden min-h-11 shrink-0 rounded-[var(--radius-control)] bg-[var(--accent-primary)] px-4 text-[13px] font-bold text-[var(--text-on-accent)] max-xl:block"
          onClick={() => {
            setEditing(null);
            setEstimateMode("1hr");
            setTaskSaveNotice(null);
            setFormOpen(true);
          }}
          type="button"
        >
          New task
        </button>
      </header>

      <section className="grid gap-6 xl:grid-cols-[390px_1fr]">
        <dialog
          aria-labelledby="task-editor-title"
          className="content-panel fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] top-auto z-[90] m-0 max-h-[calc(100dvh-7rem)] w-auto max-w-none overflow-y-auto rounded-[var(--radius-panel)] p-5 text-[var(--text-primary)] backdrop:bg-black/65 backdrop:backdrop-blur-[2px] sm:p-6 xl:sticky xl:inset-x-auto xl:bottom-auto xl:top-6 xl:col-start-1 xl:row-start-1 xl:w-full xl:max-h-none xl:self-start xl:overflow-visible"
          id="new-task"
          onCancel={(event) => {
            if (window.matchMedia("(min-width: 1280px)").matches) {
              event.preventDefault();
              return;
            }
            setFormOpen(false);
          }}
          onClick={(event) => {
            if (!event.currentTarget.matches(":modal")) return;
            const bounds = event.currentTarget.getBoundingClientRect();
            const outside =
              event.clientX < bounds.left ||
              event.clientX > bounds.right ||
              event.clientY < bounds.top ||
              event.clientY > bounds.bottom;
            if (outside) setFormOpen(false);
          }}
          ref={formDialog}
        >
          <div className="flex items-center justify-between gap-3">
            <p
              className="label-caps text-[var(--text-secondary)]"
              id="task-editor-title"
            >
              {editing ? "Edit task" : "New task"}
            </p>
            <button
              aria-label="Close task form"
              className="grid h-11 w-11 place-items-center rounded-full border border-[var(--border-subtle)] text-[20px] text-[var(--text-secondary)] xl:hidden"
              onClick={() => setFormOpen(false)}
              type="button"
            >
              ×
            </button>
          </div>
          <form
            action={saveTask}
            className="mt-5 grid gap-3"
            key={`${editing?.id ?? "new-task"}-${formVersion}`}
          >
            <input name="id" type="hidden" value={editing?.id ?? ""} />
            <input name="completed" type="hidden" value={String(editing?.completed ?? false)} />
            <Field label="Title">
              <input
                className="field-input"
                defaultValue={editing?.title ?? ""}
                name="title"
                ref={formTitleInput}
                required
              />
            </Field>
            <Field label="Category">
              <input
                className="field-input"
                defaultValue={editing?.category ?? "General"}
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
                <span className="text-[12px] leading-4 text-[var(--text-muted)]">
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
                <select
                  className="field-input"
                  name="estimateMode"
                  onChange={(event) => setEstimateMode(event.target.value as TaskEstimateMode)}
                  value={estimateMode}
                >
                  {estimateOptions.map((value) => (
                    <option key={value} value={value}>
                      {value === "other" ? "Custom" : value}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className={`grid gap-3 ${estimateMode === "other" ? "grid-cols-3" : "grid-cols-1"}`}>
              {estimateMode === "other" ? (
                <>
                  <Field label="From">
                    <input className="field-input" defaultValue={editing?.timeFrom ?? ""} name="timeFrom" required type="time" />
                  </Field>
                  <Field label="To">
                    <input className="field-input" defaultValue={editing?.timeTo ?? ""} name="timeTo" required type="time" />
                  </Field>
                </>
              ) : null}
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
                className="flex-1 rounded-[14px] bg-white px-4 py-3 text-[13px] font-semibold text-[var(--text-on-light)]"
                pendingLabel={editing ? "Saving…" : "Creating…"}
              >
                {editing ? "Save changes" : "Create task"}
              </PendingSubmitButton>
              {editing ? (
                <button
                  className="rounded-[14px] border border-white/10 bg-[var(--surface-row)] px-4 py-3 text-[13px] font-semibold text-[var(--text-secondary)]"
                  onClick={() => {
                    setEditing(null);
                    setEstimateMode("1hr");
                    setTaskSaveNotice(null);
                    setFormOpen(false);
                  }}
                  type="button"
                >
                  Cancel
                </button>
              ) : null}
            </div>
            {taskSaveNotice ? (
              <p
                aria-live="polite"
                className={taskSaveNotice.error ? "text-[13px] text-[var(--danger)]" : "text-[13px] text-[var(--accent-primary)]"}
                role={taskSaveNotice.error ? "alert" : "status"}
              >
                {taskSaveNotice.message}
              </p>
            ) : null}
          </form>
        </dialog>

        <section className="space-y-6 xl:col-start-2 xl:row-start-1">
          <dl className="content-panel grid overflow-hidden rounded-[var(--radius-panel)] sm:grid-cols-4">
            <Metric label="Active" value={stats.activeTasksCount} tone="text-white" />
            <Metric label="Done" value={stats.completedTasksCount} tone="text-[var(--accent-primary)]" />
            <Metric label="Hard" value={stats.hardTasksCount} tone="text-[var(--warning)]" />
            <Metric label="Focus min" value={stats.totalEstimateMinutes} tone="text-[var(--accent-info)]" />
          </dl>
          <section
            aria-labelledby="task-view-controls"
            className="content-panel rounded-[var(--radius-panel)] p-4 sm:p-5"
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
              <label className="grid min-w-0 flex-1 gap-2">
                <span className="label-caps text-[var(--text-secondary)]" id="task-view-controls">
                  Search tasks
                </span>
                <input
                  className="field-input"
                  onChange={(event) =>
                    updateFilter("q", event.target.value.trimStart(), "", true)
                  }
                  placeholder="Title, category, or note"
                  type="search"
                  value={searchParams.get("q") ?? ""}
                />
              </label>
              <TaskFilterSelect
                label="Status"
                onChange={(value) => updateFilter("status", value)}
                value={status}
              >
                <option value="all">All statuses</option>
                <option value="open">Open</option>
                <option value="done">Completed</option>
              </TaskFilterSelect>
              <TaskFilterSelect
                label="Date"
                onChange={(value) => updateFilter("date", value)}
                value={dateFilter}
              >
                <option value="all">Any date</option>
                <option value="overdue">Overdue</option>
                <option value="today">Today</option>
                <option value="scheduled">Upcoming</option>
              </TaskFilterSelect>
              <TaskFilterSelect
                label="Priority"
                onChange={(value) => updateFilter("priority", value)}
                value={priority}
              >
                <option value="all">Any priority</option>
                {priorityOptions.map((value) => (
                  <option key={value} value={value}>{taskPriorityLabels[value]}</option>
                ))}
              </TaskFilterSelect>
              <TaskFilterSelect
                label="Type"
                onChange={(value) => updateFilter("type", value)}
                value={type}
              >
                <option value="all">Any type</option>
                {typeOptions.map((value) => (
                  <option key={value} value={value}>{taskTypeLabels[value]}</option>
                ))}
              </TaskFilterSelect>
              <TaskFilterSelect
                label="Sort"
                onChange={(value) => updateFilter("sort", value, "today")}
                value={sort}
              >
                <option value="today">Today first</option>
                <option value="due">Due date</option>
                <option value="priority">Priority</option>
                <option value="title">Title</option>
              </TaskFilterSelect>
            </div>
            <div className="mt-3 flex min-h-11 flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-3">
              <p aria-live="polite" className="text-[12px] text-[var(--text-secondary)]">
                Showing {filteredTasks.length} of {displayTasks.length} tasks. View state is stored in the URL.
              </p>
              {filtersActive ? (
                <button
                  className="min-h-11 rounded-[var(--radius-control)] px-3 text-[12px] font-semibold text-[var(--accent-primary)] hover:bg-white/[0.05]"
                  onClick={clearFilters}
                  type="button"
                >
                  Clear filters
                </button>
              ) : null}
            </div>
          </section>
          <div className="content-panel rounded-[var(--radius-panel)] p-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="label-caps text-[var(--text-secondary)]">Active queue</p>
                <h2 className="mt-2 text-[24px] font-semibold text-white">
                  {activeTasks.length} open tasks
                </h2>
              </div>
              <span className="metric-value text-[12px] font-semibold text-[var(--success-text)]">
                {stats.completionPercent}% done
              </span>
            </div>
            <div className="mb-5 flex flex-col gap-3 rounded-[var(--radius-row)] border border-[var(--border-subtle)] bg-white/[0.025] p-3 lg:flex-row lg:items-end">
              <label className="flex min-h-11 items-center gap-3 px-1 text-[12px] font-semibold text-white">
                <input
                  checked={allVisibleSelected}
                  onChange={() =>
                    setSelectedTaskIds(
                      allVisibleSelected
                        ? []
                        : filteredTasks.map((task) => task.id),
                    )
                  }
                  type="checkbox"
                />
                Select visible ({selectedTaskIds.length} selected)
              </label>
              <div className="flex flex-1 flex-wrap gap-2 lg:justify-end">
                <button className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border-strong)] px-3 text-[12px] font-semibold text-white disabled:opacity-40" disabled={!selectedTaskIds.length || bulkPending} onClick={() => void runBulkAction("complete")} type="button">Complete</button>
                <button className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border-strong)] px-3 text-[12px] font-semibold text-white disabled:opacity-40" disabled={!selectedTaskIds.length || bulkPending} onClick={() => void runBulkAction("reopen")} type="button">Reopen</button>
                <label className="flex items-center gap-2">
                  <span className="sr-only">Bulk reschedule date</span>
                  <input className="field-input min-h-11 w-[150px]" min={today} onChange={(event) => setBulkDate(event.target.value)} type="date" value={bulkDate} />
                </label>
                <button className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border-strong)] px-3 text-[12px] font-semibold text-white disabled:opacity-40" disabled={!selectedTaskIds.length || bulkPending} onClick={() => void runBulkAction("reschedule")} type="button">Reschedule</button>
                <button className="min-h-11 rounded-[var(--radius-control)] border border-[var(--danger)]/25 bg-[var(--danger)]/10 px-3 text-[12px] font-semibold text-[var(--danger-text)] disabled:opacity-40" disabled={!selectedTaskIds.length || bulkPending} onClick={() => void runBulkAction("archive")} type="button">Archive</button>
              </div>
            </div>
            <div className="task-queue-axis grid gap-6">
              {taskGroups.map((group) => group.tasks.length > 0 ? (
                <section aria-labelledby={`task-group-${group.key}`} className="relative pl-7" key={group.key}>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-[13px] font-semibold text-white" id={`task-group-${group.key}`}>{group.label}</h3>
                    <span className="metric-value text-[12px] text-[var(--text-tertiary)]">{group.tasks.length}</span>
                  </div>
                  <div className="grid gap-3">
                    {group.tasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        onSelected={() => toggleSelected(task.id)}
                        selected={selectedTaskIds.includes(task.id)}
                        onArchived={() => setArchivedTaskId(task.id)}
                        onEdit={() => {
                          setEditing(task);
                          setEstimateMode(task.estimateMode);
                          setTaskSaveNotice(null);
                          setFormOpen(true);
                        }}
                        task={task}
                        today={today}
                        locale={locale}
                      />
                    ))}
                  </div>
                </section>
              ) : null)}

              {activeTasks.length === 0 && completedTasks.length === 0 ? (
                <EmptyState
                  action={(
                    <button
                      className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] border border-[var(--border-strong)] bg-white/[0.045] px-4 text-[12px] font-semibold text-white"
                      onClick={() => {
                        setEditing(null);
                        setEstimateMode("1hr");
                        setTaskSaveNotice(null);
                        setFormOpen(true);
                      }}
                      type="button"
                    >
                      Add a task
                    </button>
                  )}
                  description={filtersActive
                    ? "Adjust or clear the current search and filters to widen this view."
                    : "Plan only work that deserves a place in today or the days ahead."}
                  icon="✓"
                  title={filtersActive ? "No tasks match this view" : "Your active queue is clear"}
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
                        locale={locale}
                        onSelected={() => toggleSelected(task.id)}
                        selected={selectedTaskIds.includes(task.id)}
                        onArchived={() => setArchivedTaskId(task.id)}
                        onEdit={() => {
                          setEditing(task);
                          setEstimateMode(task.estimateMode);
                          setTaskSaveNotice(null);
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
          <details className="content-panel rounded-[var(--radius-panel)] p-5">
            <summary className="cursor-pointer text-[14px] font-semibold text-white">
              Archive and history · {archivedTasks.length}
            </summary>
            <p className="mt-2 text-[12px] leading-5 text-[var(--text-secondary)]">
              Archived tasks stay available here and keep their completion history.
            </p>
            <div className="mt-4 grid gap-2">
              {archivedTasks.map((task) => (
                <div className="flex flex-col gap-3 rounded-[var(--radius-row)] border border-[var(--border-subtle)] p-3 sm:flex-row sm:items-center" key={task.id}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-white">{task.title}</p>
                    <p className="mt-1 text-[12px] text-[var(--text-tertiary)]">{task.category} · {task.completed ? "Completed" : "Open when archived"}</p>
                  </div>
                  <button
                    className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border-strong)] px-3 text-[12px] font-semibold text-white"
                    onClick={async () => {
                      const result = await restoreTaskAction(task.id);
                      if (result.ok) router.refresh();
                    }}
                    type="button"
                  >
                    Restore
                  </button>
                </div>
              ))}
              {archivedTasks.length === 0 ? (
                <p className="py-3 text-[12px] text-[var(--text-tertiary)]">No archived tasks.</p>
              ) : null}
            </div>
          </details>
        </section>
      </section>
      {archivedTaskId ? (
        <ActionToast
          action={(
            <button
              className="min-h-11 shrink-0 px-2 font-bold text-[var(--accent-primary)]"
              disabled={undoPending}
              onClick={() => void undoArchive()}
              type="button"
            >
              {undoPending ? "Restoring…" : undoError ? "Retry" : "Undo"}
            </button>
          )}
          message={undoError || "Task archived."}
          tone={undoError ? "error" : "success"}
        />
      ) : null}
    </section>
  );
}

function TaskRow({
  locale,
  onArchived,
  onEdit,
  onSelected,
  selected,
  task,
  today,
}: {
  locale: string;
  onArchived: () => void;
  onEdit: () => void;
  onSelected: () => void;
  selected: boolean;
  task: Task;
  today: string;
}) {
  const dayStatus = getTaskDayStatus(task, today);
  const tone = taskDayTones[dayStatus];

  return (
    <article
      className={`task-state-enter group scroll-mt-24 grid gap-4 rounded-[var(--radius-row)] border p-4 lg:grid-cols-[1fr_auto] ${tone.card}`}
      id={`task-${task.id}`}
    >
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-3">
          <label className="flex min-h-11 shrink-0 items-center">
            <span className="sr-only">Select {task.title}</span>
            <input checked={selected} onChange={onSelected} type="checkbox" />
          </label>
          <h4 className={`min-w-0 text-[16px] font-semibold leading-6 ${tone.title}`}>
            {task.title}
          </h4>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold ${tone.badge}`}>
            {tone.label}
          </span>
        </div>
        <p className="mt-2 text-[12px] leading-[18px] text-[var(--text-secondary)]">
          {task.category} · {formatTaskTime(task)} · {taskComplexityLabels[task.complexity]} · {taskPriorityLabels[task.priority]}
          {task.dueDate ? (
            <>
              {" · due "}
              <time
                aria-label={`Due ${formatExactDate(task.dueDate, locale)}`}
                dateTime={task.dueDate}
                title={formatExactDate(task.dueDate, locale)}
              >
                {formatTaskDueDate(task, today, locale)}
              </time>
            </>
          ) : ""}
        </p>
        {task.note ? (
          <details className="mt-2">
            <summary className="min-h-11 cursor-pointer py-2 text-[12px] font-semibold text-[var(--text-secondary)]">
              View note
            </summary>
            <p className="whitespace-pre-wrap pb-1 text-[12px] leading-5 text-[var(--text-tertiary)]">
              {task.note}
            </p>
          </details>
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
            triggerClassName="min-h-11 rounded-[var(--radius-control)] border border-[var(--danger)]/25 bg-[var(--danger)]/10 px-3 text-[12px] font-semibold text-[var(--danger-text)]"
            triggerLabel="Archive"
          />
        </div>
      </div>
    </article>
  );
}

function TaskFilterSelect({
  children,
  label,
  onChange,
  value,
}: {
  children: ReactNode;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="grid min-w-[132px] gap-2">
      <span className="label-caps text-[var(--text-secondary)]">{label}</span>
      <select
        className="field-input"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {children}
      </select>
    </label>
  );
}

function valueFromOptions<const T extends readonly string[]>(
  value: string | null,
  options: T,
  fallback: T[number],
) {
  return options.includes(value ?? "") ? (value as T[number]) : fallback;
}

function sortTaskList(tasks: Task[], sort: TaskSort, today: string) {
  const priorityRank = { high: 0, normal: 1, low: 2 } as const;
  const dayRank = { overdue: 0, today: 1, scheduled: 2, completed: 3 } as const;
  return [...tasks].sort((a, b) => {
    if (sort === "title") return a.title.localeCompare(b.title);
    if (sort === "priority") {
      return (
        priorityRank[a.priority] - priorityRank[b.priority] ||
        (a.dueDate || "9999-12-31").localeCompare(b.dueDate || "9999-12-31")
      );
    }
    if (sort === "due") {
      return (
        (a.dueDate || "9999-12-31").localeCompare(b.dueDate || "9999-12-31") ||
        priorityRank[a.priority] - priorityRank[b.priority]
      );
    }
    return (
      dayRank[getTaskDayStatus(a, today)] -
        dayRank[getTaskDayStatus(b, today)] ||
      priorityRank[a.priority] - priorityRank[b.priority]
    );
  });
}

function formatTaskDueDate(task: Task, today: string, locale: string) {
  const relative = formatRelativeTaskDate(task, today);
  if (
    relative === "Today" ||
    relative === "Tomorrow" ||
    relative.endsWith("overdue")
  ) {
    return relative;
  }
  return task.dueDate ? formatCompactDate(task.dueDate, locale) : relative;
}

function formatCompactDate(date: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

function formatExactDate(date: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

const taskDayTones = {
  completed: {
    badge: "bg-[var(--accent-primary)]/12 text-[var(--success-text)]",
    card: "border-[var(--accent-primary)]/15 bg-[var(--accent-primary)]/[0.04]",
    label: "Done today",
    title: "text-[var(--text-muted)] line-through",
  },
  overdue: {
    badge: "bg-[var(--danger)]/15 text-[var(--danger-text)]",
    card: "border-[var(--danger)]/35 bg-[var(--danger)]/[0.08]",
    label: "Rolled over",
    title: "text-[var(--danger)]",
  },
  scheduled: {
    badge: "bg-[var(--accent-info)]/15 text-[var(--info-text)]",
    card: "border-[var(--accent-info)]/35 bg-[var(--accent-info)]/[0.08]",
    label: "Scheduled",
    title: "text-[#dbeafe]",
  },
  today: {
    badge: "bg-white/[0.07] text-[var(--text-secondary)]",
    card: "border-white/10 bg-[var(--surface-row)]/55",
    label: "Today",
    title: "text-white",
  },
} as const;

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="grid gap-2">
      <span className="label-caps text-[var(--text-secondary)]">{label}</span>
      {children}
    </label>
  );
}

function Metric({ label, tone, value }: { label: string; tone: string; value: number }) {
  return (
    <div className="border-b border-[var(--border-subtle)] p-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <dt className="label-caps text-[var(--text-secondary)]">{label}</dt>
      <dd className={`metric-value mt-3 text-[28px] font-semibold ${tone}`}>{value}</dd>
    </div>
  );
}
