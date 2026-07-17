"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LinkPendingIndicator } from "@/components/LinkPendingIndicator";

const actions = [
  { detail: "Create and schedule work", group: "Tasks", href: "/tasks#new-task", keywords: "new create todo", label: "Add task" },
  { detail: "Review today and overdue work", group: "Tasks", href: "/tasks", keywords: "today overdue queue", label: "Open task queue" },
  { detail: "Open today’s training", group: "Fitness", href: "/fitness#training-calendar", keywords: "complete session exercise", label: "Log workout" },
  { detail: "Adjust the reusable week", group: "Fitness", href: "/fitness#weekly-plan", keywords: "edit schedule sport", label: "Edit fitness plan" },
  { detail: "Import a monthly bank statement", group: "Finance", href: "/finance#bank-statement-import", keywords: "pdf bank statement upload", label: "Add transactions" },
  { detail: "Review balance and spending", group: "Finance", href: "/finance", keywords: "money cashflow expense income", label: "Open finance" },
] as const;

const recentStorageKey = "orbit-recent-quick-action";

export function QuickAdd() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [recentHref, setRecentHref] = useState("");
  const actionRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const container = useRef<HTMLDivElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setRecentHref(window.localStorage.getItem(recentStorageKey) ?? "");
        setActiveIndex(0);
        setQuery("");
        setOpen((current) => !current);
      }
      if (event.key === "Escape") {
        setOpen(false);
        window.requestAnimationFrame(() => trigger.current?.focus());
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => searchInput.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const matches = actions.filter((action) =>
    `${action.label} ${action.detail} ${action.group} ${action.keywords}`
      .toLocaleLowerCase()
      .includes(normalizedQuery),
  );
  const recentAction = !normalizedQuery
    ? matches.find((action) => action.href === recentHref)
    : undefined;
  const visibleActions = recentAction
    ? [recentAction, ...matches.filter((action) => action.href !== recentAction.href)]
    : matches;

  function choose(href: string) {
    window.localStorage.setItem(recentStorageKey, href);
    setRecentHref(href);
  }

  function togglePalette() {
    if (!open) {
      setRecentHref(window.localStorage.getItem(recentStorageKey) ?? "");
      setActiveIndex(0);
      setQuery("");
    }
    setOpen((current) => !current);
  }

  function navigateWithKeyboard(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % Math.max(1, visibleActions.length));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) =>
        (current - 1 + Math.max(1, visibleActions.length)) % Math.max(1, visibleActions.length),
      );
    }
    if (event.key === "Enter" && visibleActions[activeIndex]) {
      event.preventDefault();
      actionRefs.current[visibleActions[activeIndex].href]?.click();
    }
  }

  return (
    <div className="relative z-50" ref={container}>
      <button
        aria-controls="quick-add-dialog"
        aria-expanded={open}
        aria-haspopup="dialog"
        className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] border border-[var(--border-strong)] bg-white/[0.045] px-4 py-2.5 text-[13px] font-semibold text-white transition duration-150 hover:bg-white/[0.08]"
        onClick={togglePalette}
        ref={trigger}
        type="button"
      >
        <span aria-hidden="true">＋</span>
        Quick add
        <kbd className="hidden rounded-md bg-white/[0.07] px-1.5 py-0.5 text-[10px] text-[var(--text-secondary)] sm:inline">⌘K</kbd>
      </button>
      {open ? (
        <>
          <button
            aria-label="Close Quick Add"
            className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px] sm:hidden"
            onClick={() => {
              setOpen(false);
              window.requestAnimationFrame(() => trigger.current?.focus());
            }}
            type="button"
          />
          <div
            aria-label="Quick Add commands"
            className="glass-modal modal-animate fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] top-auto z-[100] w-auto rounded-[22px] p-2 sm:absolute sm:bottom-auto sm:left-0 sm:right-auto sm:top-12 sm:w-[340px] sm:rounded-[18px]"
            id="quick-add-dialog"
            role="dialog"
          >
            <label className="relative block">
              <span className="sr-only">Search Quick Add actions</span>
              <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]">⌕</span>
              <input
                aria-controls="quick-add-options"
                aria-expanded={open}
                aria-autocomplete="list"
                aria-activedescendant={visibleActions[activeIndex] ? `quick-action-${activeIndex}` : undefined}
                className="h-11 w-full rounded-[12px] border border-[var(--border-subtle)] bg-black/20 pl-9 pr-3 text-[13px] text-white outline-none placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)]"
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={navigateWithKeyboard}
                placeholder="Search actions…"
                ref={searchInput}
                role="combobox"
                value={query}
              />
            </label>

            <div className="mt-2 max-h-[min(360px,48vh)] overflow-y-auto" id="quick-add-options" role="listbox">
              {visibleActions.map((action, index) => {
                const isRecent = recentAction?.href === action.href && index === 0;
                return (
                  <div key={action.href}>
                    {(index === 0 || action.group !== visibleActions[index - 1]?.group || isRecent) ? (
                      <p className="label-caps px-3 pb-1 pt-2 text-[var(--text-tertiary)]">
                        {isRecent ? "Recent" : action.group}
                      </p>
                    ) : null}
                    <Link
                      aria-selected={index === activeIndex}
                      className={`block rounded-[13px] px-3 py-3 transition ${index === activeIndex ? "bg-white/[0.08]" : "hover:bg-white/[0.06]"}`}
                      href={action.href}
                      id={`quick-action-${index}`}
                      onClick={() => choose(action.href)}
                      onMouseEnter={() => setActiveIndex(index)}
                      ref={(node) => { actionRefs.current[action.href] = node; }}
                      role="option"
                    >
                      <span className="flex items-center justify-between gap-3">
                        <span className="text-[13px] font-semibold text-white">{action.label}</span>
                        <span className="text-[10px] font-semibold text-[var(--text-tertiary)]">{action.group}</span>
                      </span>
                      <span className="mt-1 block text-[11px] text-[#aeb2b4]">{action.detail}</span>
                      <LinkPendingIndicator label={`Opening ${action.label}`} />
                    </Link>
                  </div>
                );
              })}
              {visibleActions.length === 0 ? (
                <div className="px-3 py-6 text-center">
                  <p className="text-[13px] font-semibold text-white">No matching action</p>
                  <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">Try “task”, “workout”, or “finance”.</p>
                </div>
              ) : null}
            </div>
            <div className="mt-2 hidden items-center justify-between border-t border-[var(--border-subtle)] px-3 pt-2 text-[10px] text-[var(--text-tertiary)] sm:flex">
              <span>↑↓ navigate · ↵ open</span>
              <span>esc close</span>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
