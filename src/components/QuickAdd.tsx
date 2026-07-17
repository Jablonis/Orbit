"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const actions = [
  { detail: "Create and schedule work", href: "/tasks#new-task", label: "Add task" },
  { detail: "Open today’s training", href: "/fitness#training-calendar", label: "Log workout" },
  { detail: "Import or manage cashflow", href: "/finance#csv-tools", label: "Add transaction" },
] as const;

export function QuickAdd() {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
      if (event.key === "Escape") setOpen(false);
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

  return (
    <div className="relative z-50" ref={container}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-[13px] font-bold text-[#202020]"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span aria-hidden="true">＋</span>
        Quick add
        <kbd className="hidden rounded-md bg-black/10 px-1.5 py-0.5 text-[10px] sm:inline">⌘K</kbd>
      </button>
      {open ? (
        <>
          <button
            aria-label="Close Quick Add"
            className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px] sm:hidden"
            onClick={() => setOpen(false)}
            type="button"
          />
          <div
            className="glass-modal modal-animate fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] top-auto z-[100] w-auto rounded-[22px] p-2 sm:absolute sm:bottom-auto sm:left-0 sm:right-auto sm:top-12 sm:w-72 sm:rounded-[18px]"
            role="menu"
          >
            <p className="label-caps px-3 pb-2 pt-2 text-[#a3e635] sm:hidden">
              Quick add
            </p>
            {actions.map((action) => (
              <Link
                className="block rounded-[13px] px-3 py-3 transition hover:bg-white/[0.07]"
                href={action.href}
                key={action.href}
                onClick={() => setOpen(false)}
                role="menuitem"
              >
                <span className="block text-[13px] font-semibold text-white">{action.label}</span>
                <span className="mt-1 block text-[11px] text-[#aeb2b4]">{action.detail}</span>
              </Link>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
