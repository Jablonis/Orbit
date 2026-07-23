"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type CSSProperties,
} from "react";
import { completeTodayTrainingAction } from "@/app/fitness/actions";
import { saveTaskAction } from "@/app/tasks/actions";
import { ActionToast } from "@/components/ActionToast";
import { LinkPendingIndicator } from "@/components/LinkPendingIndicator";
import { openOrbitSettingsEvent } from "@/components/OpenDashboardSettingsButton";

type SearchResult = {
  detail: string;
  href: string;
  id: string;
  kind: "task" | "transaction" | "category";
  label: string;
};

type QuickAction = {
  detail: string;
  group: string;
  href?: string;
  id: string;
  keywords: string;
  kind: "link" | "settings" | "task" | "workout";
  label: string;
};

const actions: QuickAction[] = [
  { detail: "Create it without leaving this page", group: "Capture", id: "add-task", keywords: "new create todo", kind: "task", label: "Add task" },
  { detail: "Mark today’s planned session complete", group: "Capture", id: "complete-workout", keywords: "fitness done log exercise", kind: "workout", label: "Complete today’s workout" },
  { detail: "Import a monthly bank statement", group: "Capture", href: "/finance#bank-statement-import", id: "import-statement", keywords: "pdf bank statement upload transactions", kind: "link", label: "Import statement" },
  { detail: "Review today and overdue work", group: "Navigate", href: "/tasks", id: "open-tasks", keywords: "today overdue queue", kind: "link", label: "Open task queue" },
  { detail: "Open today’s training plan", group: "Navigate", href: "/fitness#training-calendar", id: "open-fitness", keywords: "session exercise plan", kind: "link", label: "Open fitness" },
  { detail: "Review cashflow and spending", group: "Navigate", href: "/finance", id: "open-finance", keywords: "money cashflow expense income", kind: "link", label: "Open finance" },
  { detail: "Return to Today and Trends", group: "Navigate", href: "/", id: "open-overview", keywords: "dashboard home settings customize", kind: "link", label: "Open overview" },
  { detail: "Open profile and dashboard preferences", group: "Navigate", id: "open-settings", keywords: "settings goals privacy appearance shortcuts customize", kind: "settings", label: "Open settings" },
];

const recentStorageKey = "orbit-recent-quick-action";
const pinnedStorageKey = "orbit-pinned-quick-actions";
const frequencyStorageKey = "orbit-quick-action-frequency";

export function QuickAdd() {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const [entityResults, setEntityResults] = useState<SearchResult[]>([]);
  const [frequencies, setFrequencies] = useState<Record<string, number>>({});
  const [notice, setNotice] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [pins, setPins] = useState<string[]>([]);
  const [position, setPosition] = useState({ left: 12, top: 64 });
  const [query, setQuery] = useState("");
  const [recentId, setRecentId] = useState("");
  const [searching, setSearching] = useState(false);
  const [view, setView] = useState<"commands" | "task">("commands");
  const dialog = useRef<HTMLDialogElement>(null);
  const optionRefs = useRef<Record<string, HTMLElement | null>>({});
  const searchInput = useRef<HTMLInputElement>(null);
  const taskTitleInput = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  const preparePalette = useCallback(() => {
    const bounds = trigger.current?.getBoundingClientRect();
    if (bounds) {
      setPosition({
        left: Math.max(12, Math.min(bounds.left, window.innerWidth - 364)),
        top: Math.max(12, Math.min(bounds.bottom + 8, window.innerHeight - 520)),
      });
    }
    setRecentId(window.localStorage.getItem(recentStorageKey) ?? "");
    setPins(readJson<string[]>(pinnedStorageKey, []));
    setFrequencies(readJson<Record<string, number>>(frequencyStorageKey, {}));
    setActiveIndex(0);
    setEntityResults([]);
    setQuery("");
    setView("commands");
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (open) setOpen(false);
        else {
          preparePalette();
          setOpen(true);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, preparePalette]);

  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (open && !node.open) {
      node.showModal();
      const frame = window.requestAnimationFrame(() => searchInput.current?.focus());
      return () => window.cancelAnimationFrame(frame);
    }
    if (!open && node.open) node.close();
  }, [open]);

  useEffect(() => {
    if (!open || view !== "task") return;
    const frame = window.requestAnimationFrame(() => taskTitleInput.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open, view]);

  useEffect(() => {
    const normalized = query.trim();
    if (!open || view !== "commands" || normalized.length < 2) {
      return;
    }
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(normalized)}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = (await response.json()) as { results?: SearchResult[] };
        if (response.ok) setEntityResults(payload.results ?? []);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setEntityResults([]);
        }
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 180);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [open, query, view]);

  const visibleActions = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return actions
      .filter((action) =>
        `${action.label} ${action.detail} ${action.group} ${action.keywords}`
          .toLocaleLowerCase()
          .includes(normalized),
      )
      .sort((a, b) => {
        const pinDifference = Number(pins.includes(b.id)) - Number(pins.includes(a.id));
        if (pinDifference) return pinDifference;
        const recentDifference = Number(b.id === recentId) - Number(a.id === recentId);
        if (recentDifference) return recentDifference;
        return (frequencies[b.id] ?? 0) - (frequencies[a.id] ?? 0);
      });
  }, [frequencies, pins, query, recentId]);

  const options = [
    ...entityResults.map((result) => ({ id: `entity-${result.kind}-${result.id}`, type: "entity" as const, value: result })),
    ...visibleActions.map((action) => ({ id: `action-${action.id}`, type: "action" as const, value: action })),
  ];

  function recordAction(id: string) {
    window.localStorage.setItem(recentStorageKey, id);
    const nextFrequencies = { ...frequencies, [id]: (frequencies[id] ?? 0) + 1 };
    window.localStorage.setItem(frequencyStorageKey, JSON.stringify(nextFrequencies));
    setRecentId(id);
    setFrequencies(nextFrequencies);
  }

  function runAction(action: QuickAction) {
    recordAction(action.id);
    if (action.kind === "task") {
      setView("task");
      return;
    }
    if (action.kind === "settings") {
      window.dispatchEvent(new Event(openOrbitSettingsEvent));
      setOpen(false);
      return;
    }
    if (action.kind === "workout") {
      startTransition(async () => {
        try {
          const result = await completeTodayTrainingAction();
          if (!result.ok) {
            setNotice({ message: result.error, tone: "error" });
            return;
          }
          setNotice({ message: "Today’s workout is complete.", tone: "success" });
          setOpen(false);
          router.refresh();
        } catch {
          setNotice({ message: "Today’s workout could not be updated. Try again.", tone: "error" });
        }
      });
    }
  }

  function runOption(index: number) {
    const option = options[index];
    if (!option) return;
    if (option.type === "action") {
      if (option.value.kind === "link") {
        optionRefs.current[option.id]?.click();
      } else {
        runAction(option.value);
      }
      return;
    }
    optionRefs.current[option.id]?.click();
  }

  function togglePin(id: string) {
    const nextPins = pins.includes(id)
      ? pins.filter((pin) => pin !== id)
      : [...pins, id];
    window.localStorage.setItem(pinnedStorageKey, JSON.stringify(nextPins));
    setPins(nextPins);
  }

  function navigateWithKeyboard(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % Math.max(1, options.length));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) =>
        (current - 1 + Math.max(1, options.length)) % Math.max(1, options.length),
      );
    }
    if (event.key === "Enter") {
      event.preventDefault();
      runOption(activeIndex);
    }
  }

  function saveQuickTask(formData: FormData) {
    startTransition(async () => {
      try {
        const result = await saveTaskAction(formData);
        if (!result.ok) {
          setNotice({ message: result.error, tone: "error" });
          return;
        }
        setNotice({ message: "Task created.", tone: "success" });
        setOpen(false);
        router.refresh();
      } catch {
        setNotice({ message: "The task could not be created. Your input is still here.", tone: "error" });
      }
    });
  }

  return (
    <>
      <div className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] right-4 z-50 md:bottom-[84px] md:left-[34px] md:right-auto">
        <button
          aria-controls="quick-add-dialog"
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label="Open Quick Add"
          className="grid h-11 w-11 place-items-center rounded-full border border-[var(--border-strong)] bg-[var(--accent-primary)] text-[24px] font-medium text-[var(--surface-nav)] shadow-[0_14px_32px_rgba(0,0,0,0.38)] transition hover:scale-[1.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-primary)]"
          onClick={() => {
            if (!open) preparePalette();
            setOpen((current) => !current);
          }}
          ref={trigger}
          title="Quick Add (⌘K)"
          type="button"
        >
          <span aria-hidden="true">＋</span>
        </button>
      </div>
      <dialog
        aria-label={view === "task" ? "Quick task" : "Quick Add commands"}
        aria-modal="true"
        className="glass-modal modal-animate fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] top-auto z-[100] m-0 max-h-[min(78dvh,560px)] w-auto overflow-y-auto rounded-[22px] border-0 p-2 text-[var(--text-primary)] backdrop:bg-black/55 backdrop:backdrop-blur-[2px] sm:inset-x-auto sm:bottom-auto sm:left-[var(--quick-add-left)] sm:top-[var(--quick-add-top)] sm:w-[352px] sm:rounded-[18px] sm:backdrop:bg-transparent sm:backdrop:backdrop-blur-none"
        id="quick-add-dialog"
        onCancel={(event) => {
          event.preventDefault();
          setOpen(false);
        }}
        onClick={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom
          ) setOpen(false);
        }}
        onClose={() => {
          setOpen(false);
          window.requestAnimationFrame(() => trigger.current?.focus());
        }}
        ref={dialog}
        style={{
          "--quick-add-left": `${position.left}px`,
          "--quick-add-top": `${position.top}px`,
        } as CSSProperties}
      >
        {view === "task" ? (
          <form action={saveQuickTask} className="p-2">
            <div className="flex items-center gap-2">
              <button
                aria-label="Back to commands"
                className="grid h-11 w-11 place-items-center rounded-[12px] text-[var(--text-secondary)] hover:bg-white/[0.06]"
                onClick={() => setView("commands")}
                type="button"
              >
                ←
              </button>
              <div>
                <p className="label-caps text-[var(--accent-primary)]">Quick capture</p>
                <h2 className="mt-1 text-[16px] font-semibold text-white">Add a task</h2>
              </div>
            </div>
            <label className="mt-4 grid gap-2">
              <span className="label-caps text-[var(--text-secondary)]">Task title</span>
              <input
                className="field-input"
                maxLength={200}
                name="title"
                placeholder="What needs to move?"
                ref={taskTitleInput}
                required
              />
            </label>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="grid gap-2">
                <span className="label-caps text-[var(--text-secondary)]">Category</span>
                <input className="field-input" defaultValue="General" maxLength={80} name="category" />
              </label>
              <label className="grid gap-2">
                <span className="label-caps text-[var(--text-secondary)]">Due date</span>
                <input className="field-input" name="dueDate" type="date" />
              </label>
            </div>
            <button
              className="mt-4 min-h-11 w-full rounded-[var(--radius-control)] bg-white px-4 text-[13px] font-bold text-[var(--text-on-light)] disabled:opacity-55"
              disabled={pending}
              type="submit"
            >
              {pending ? "Creating…" : "Create task"}
            </button>
            <p className="mt-3 text-[12px] leading-5 text-[var(--text-tertiary)]">
              The full task editor remains available in Tasks. Failed saves keep
              these fields intact so you can retry.
            </p>
          </form>
        ) : (
          <>
            <label className="relative block">
              <span className="sr-only">Search commands and Orbit data</span>
              <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]">⌕</span>
              <input
                aria-activedescendant={options[activeIndex]?.id}
                aria-autocomplete="list"
                aria-controls="quick-add-options"
                aria-expanded={open}
                className="h-11 w-full rounded-[12px] border border-[var(--border-subtle)] bg-black/20 pl-9 pr-3 text-[13px] text-white outline-none placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)]"
                onChange={(event) => {
                  const nextQuery = event.target.value;
                  setQuery(nextQuery);
                  if (nextQuery.trim().length < 2) {
                    setEntityResults([]);
                    setSearching(false);
                  }
                  setActiveIndex(0);
                }}
                onKeyDown={navigateWithKeyboard}
                placeholder="Search or run a command…"
                ref={searchInput}
                role="combobox"
                value={query}
              />
            </label>
            <div className="mt-2 max-h-[min(390px,52vh)] overflow-y-auto" id="quick-add-options" role="listbox">
              {entityResults.length > 0 ? (
                <p className="label-caps px-3 pb-1 pt-2 text-[var(--text-tertiary)]">Orbit results</p>
              ) : null}
              {entityResults.map((result, index) => {
                const optionId = `entity-${result.kind}-${result.id}`;
                return (
                  <Link
                    aria-selected={index === activeIndex}
                    className={`block min-h-11 rounded-[13px] px-3 py-3 transition ${index === activeIndex ? "bg-white/[0.08]" : "hover:bg-white/[0.06]"}`}
                    href={result.href}
                    id={optionId}
                    key={optionId}
                    onClick={() => setOpen(false)}
                    onMouseEnter={() => setActiveIndex(index)}
                    ref={(node) => { optionRefs.current[optionId] = node; }}
                    role="option"
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="truncate text-[13px] font-semibold text-white">{result.label}</span>
                      <span className="text-[12px] font-semibold capitalize text-[var(--text-tertiary)]">{result.kind}</span>
                    </span>
                    <span className="mt-1 block truncate text-[12px] text-[var(--text-tertiary)]">{result.detail}</span>
                    <LinkPendingIndicator label={`Opening ${result.label}`} />
                  </Link>
                );
              })}
              {visibleActions.length > 0 ? (
                <p className="label-caps px-3 pb-1 pt-2 text-[var(--text-tertiary)]">
                  {query ? "Commands" : pins.length ? "Pinned and frequent" : "Commands"}
                </p>
              ) : null}
              {visibleActions.map((action, actionIndex) => {
                const index = entityResults.length + actionIndex;
                const optionId = `action-${action.id}`;
                const selected = index === activeIndex;
                const content = (
                  <>
                    <span className="flex items-center justify-between gap-3">
                      <span className="text-[13px] font-semibold text-white">{action.label}</span>
                      <span className="text-[12px] font-semibold text-[var(--text-tertiary)]">{action.group}</span>
                    </span>
                    <span className="mt-1 block text-[12px] text-[var(--text-tertiary)]">{action.detail}</span>
                  </>
                );
                return (
                  <div className={`group flex rounded-[13px] ${selected ? "bg-white/[0.08]" : "hover:bg-white/[0.06]"}`} key={action.id}>
                    {action.kind === "link" && action.href ? (
                      <Link
                        aria-selected={selected}
                        className="min-h-11 min-w-0 flex-1 px-3 py-3"
                        href={action.href}
                        id={optionId}
                        onClick={() => {
                          recordAction(action.id);
                          setOpen(false);
                        }}
                        onMouseEnter={() => setActiveIndex(index)}
                        ref={(node) => { optionRefs.current[optionId] = node; }}
                        role="option"
                      >
                        {content}
                        <LinkPendingIndicator label={`Opening ${action.label}`} />
                      </Link>
                    ) : (
                      <button
                        aria-selected={selected}
                        className="min-h-11 min-w-0 flex-1 px-3 py-3 text-left"
                        disabled={pending}
                        id={optionId}
                        onClick={() => runAction(action)}
                        onMouseEnter={() => setActiveIndex(index)}
                        ref={(node) => { optionRefs.current[optionId] = node; }}
                        role="option"
                        type="button"
                      >
                        {content}
                      </button>
                    )}
                    <button
                      aria-label={`${pins.includes(action.id) ? "Unpin" : "Pin"} ${action.label}`}
                      aria-pressed={pins.includes(action.id)}
                      className="grid h-11 w-11 shrink-0 place-items-center self-center rounded-[11px] text-[16px] text-[var(--text-tertiary)] hover:bg-white/[0.07] hover:text-white"
                      onClick={() => togglePin(action.id)}
                      title={pins.includes(action.id) ? "Unpin command" : "Pin command"}
                      type="button"
                    >
                      <span aria-hidden="true">{pins.includes(action.id) ? "★" : "☆"}</span>
                    </button>
                  </div>
                );
              })}
              {options.length === 0 ? (
                <div className="px-3 py-6 text-center">
                  <p className="text-[13px] font-semibold text-white">
                    {searching ? "Searching Orbit…" : "No matching result"}
                  </p>
                  <p className="mt-1 text-[12px] text-[var(--text-tertiary)]">
                    Try a task, transaction, category, or command.
                  </p>
                </div>
              ) : null}
            </div>
            <div className="mt-2 hidden items-center justify-between border-t border-[var(--border-subtle)] px-3 pt-2 text-[12px] text-[var(--text-tertiary)] sm:flex">
              <span>↑↓ navigate · ↵ open</span>
              <span>⌘K toggle · esc close</span>
            </div>
          </>
        )}
      </dialog>
      {notice ? (
        <ActionToast
          action={(
            <button
              className="min-h-11 px-2 font-bold text-[var(--accent-primary)]"
              onClick={() => setNotice(null)}
              type="button"
            >
              Dismiss
            </button>
          )}
          message={notice.message}
          tone={notice.tone}
        />
      ) : null}
    </>
  );
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}
