"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
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
  const [archivedTaskId, setArchivedTaskId] = useState<string | null>(null);
  const displayTasks = tasks.filter((task) => task.id !== archivedTaskId);
  const activeTasks = displayTasks.filter((task) => !task.completed);

  return (
    <section className="mx-auto w-full max-w-[1440px] px-4 py-8 md:px-10">
      <header className="mb-8">
        <p className="label-caps text-[#60a5fa]">Task system</p>
        <h1 className="mt-2 text-[34px] font-semibold leading-[40px] text-white sm:text-[44px] sm:leading-[52px]">
          Task planning
        </h1>
        <p className="mt-3 max-w-2xl text-[14px] leading-6 text-[#c4c7c8]">
          Done tasks clear from this daily list tomorrow. Unfinished tasks roll over
          in red, while tasks planned for a future date stay blue.
        </p>
      </header>

      <section className="grid gap-6 xl:grid-cols-[390px_1fr]">
        <aside className="glass-panel rounded-[24px] p-6" id="new-task">
          <p className="label-caps text-[#c4c7c8]">{editing ? "Edit task" : "New task"}</p>
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
              <button className="flex-1 rounded-[14px] bg-white px-4 py-3 text-[13px] font-semibold text-[#202020]" type="submit">
                {editing ? "Save changes" : "Create task"}
              </button>
              {editing ? (
                <button
                  className="rounded-[14px] border border-white/10 bg-[#201f1f] px-4 py-3 text-[13px] font-semibold text-[#c4c7c8]"
                  onClick={() => setEditing(null)}
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
          <div className="glass-panel rounded-[24px] p-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="label-caps text-[#c4c7c8]">Active queue</p>
                <h2 className="mt-2 text-[24px] font-semibold text-white">
                  {activeTasks.length} open tasks
                </h2>
              </div>
              <span className="rounded-full bg-[#a3e635]/12 px-3 py-1 text-[12px] font-semibold text-[#d9f99d]">
                {stats.completionPercent}% done
              </span>
            </div>
            <div className="grid gap-3">
              {displayTasks.map((task) => {
                const dayStatus = getTaskDayStatus(task, today);
                const tone = taskDayTones[dayStatus];

                return (
                  <article
                    className={`grid gap-4 rounded-[18px] border p-4 lg:grid-cols-[1fr_auto] ${tone.card}`}
                    key={task.id}
                  >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className={`text-[16px] font-semibold ${tone.title}`}>
                        {task.title}
                      </h3>
                      <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-semibold text-[#c4c7c8]">
                        {taskTypeLabels[task.type]}
                      </span>
                      <span className="rounded-full bg-[#60a5fa]/10 px-2.5 py-1 text-[11px] font-semibold text-[#bfdbfe]">
                        {task.priority}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone.badge}`}>
                        {tone.label}
                      </span>
                    </div>
                    <p className="mt-2 text-[13px] text-[#c4c7c8]">
                      {task.category} · {formatTaskTime(task)}
                      {task.dueDate ? ` · due ${task.dueDate}` : ""}
                    </p>
                    {task.note ? (
                      <p className="mt-2 text-[13px] leading-5 text-[#8d9092]">{task.note}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <form action={toggleTaskAction}>
                      <input name="id" type="hidden" value={task.id} />
                      <input name="completed" type="hidden" value={String(!task.completed)} />
                      <button className="rounded-[12px] border border-white/10 bg-[#2a2a2a] px-3 py-2 text-[12px] font-semibold text-white" type="submit">
                        {task.completed ? "Reopen" : "Done"}
                      </button>
                    </form>
                    <button
                      className="rounded-[12px] border border-white/10 bg-[#2a2a2a] px-3 py-2 text-[12px] font-semibold text-[#c4c7c8]"
                      onClick={() => setEditing(task)}
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
                      onSuccess={() => setArchivedTaskId(task.id)}
                      title="Archive this task?"
                      triggerClassName="rounded-[12px] border border-[#ffb4ab]/20 bg-[#ffb4ab]/10 px-3 py-2 text-[12px] font-semibold text-[#ffdad6]"
                      triggerLabel="Archive"
                    />
                  </div>
                  </article>
                );
              })}
              {displayTasks.length === 0 ? (
                <p className="rounded-[18px] border border-white/10 bg-[#201f1f]/55 p-5 text-[14px] text-[#c4c7c8]">
                  No tasks yet. Create your first task from the panel.
                </p>
              ) : null}
            </div>
          </div>
        </section>
      </section>
      {archivedTaskId ? (
        <div
          className="glass-modal fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-full px-4 py-3 text-[13px] text-white md:left-[calc(50%+56px)]"
          role="status"
        >
          Task archived.
          <button
            className="font-bold text-[#a3e635]"
            onClick={async () => {
              const result = await restoreTaskAction(archivedTaskId);
              if (result.ok) setArchivedTaskId(null);
            }}
            type="button"
          >
            Undo
          </button>
        </div>
      ) : null}
    </section>
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
    badge: "bg-[#ff6b6b]/15 text-[#ffc9c9]",
    card: "border-[#ff6b6b]/35 bg-[#ff6b6b]/[0.08]",
    label: "Rolled over",
    title: "text-[#ffb4ab]",
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
    <article className="glass-panel rounded-[18px] p-4">
      <p className="label-caps text-[#c4c7c8]">{label}</p>
      <p className={`mt-3 text-[28px] font-semibold ${tone}`}>{value}</p>
    </article>
  );
}
