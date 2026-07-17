"use client";

import type { MouseEvent, ReactNode } from "react";
import { useRef } from "react";

export function ProfileMenu({
  children,
  userEmail,
}: {
  children?: ReactNode;
  userEmail: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const initial = userEmail.trim().slice(0, 1).toUpperCase() || "O";

  function open() {
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  function closeFromBackdrop(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) close();
  }

  return (
    <>
      <button
        aria-label="Open profile and settings"
        className="fixed bottom-6 left-[34px] z-50 hidden h-11 w-11 place-items-center overflow-hidden rounded-full border border-[var(--border-strong)] bg-[conic-gradient(from_140deg,var(--accent-highlight),var(--accent-info),var(--accent-primary),var(--accent-highlight))] text-[12px] font-bold text-[#101011] shadow-[0_14px_34px_rgba(0,0,0,0.38)] transition duration-150 hover:scale-[1.04] md:grid"
        onClick={open}
        title={userEmail}
        type="button"
      >
        {initial}
      </button>
      <button
        aria-label="Open profile and settings"
        className="floating-panel fixed right-4 top-[calc(1rem+env(safe-area-inset-top))] z-40 grid h-11 w-11 place-items-center rounded-full text-[var(--text-primary)] md:hidden"
        onClick={open}
        type="button"
      >
        <SettingsIcon />
      </button>

      <dialog
        aria-labelledby="profile-settings-title"
        className="floating-panel modal-animate fixed inset-x-3 bottom-[calc(1rem+env(safe-area-inset-bottom))] top-auto m-0 max-h-[calc(100dvh-2rem)] w-auto max-w-none overflow-y-auto rounded-[var(--radius-panel)] p-0 text-left text-[var(--text-primary)] backdrop:bg-black/70 backdrop:backdrop-blur-[2px] md:inset-x-auto md:bottom-6 md:right-6 md:w-[min(580px,calc(100vw-3rem))]"
        onClick={closeFromBackdrop}
        ref={dialogRef}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] bg-[#151516]/92 px-5 py-4 backdrop-blur-xl sm:px-6">
          <div>
            <p className="label-caps text-[var(--accent-primary)]">Orbit settings</p>
            <h2 className="mt-1 text-[22px] font-semibold" id="profile-settings-title">
              Profile and preferences
            </h2>
          </div>
          <button
            aria-label="Close profile and settings"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[var(--border-subtle)] text-[20px] text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-white"
            onClick={close}
            type="button"
          >
            ×
          </button>
        </div>

        <div className="grid gap-5 p-5 sm:p-6">
          <section aria-labelledby="account-heading" className="content-panel rounded-[var(--radius-row)] p-4">
            <p className="label-caps text-[var(--text-tertiary)]" id="account-heading">
              Account
            </p>
            <div className="mt-3 flex items-center gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--surface-hover)] text-[13px] font-bold text-white">
                {initial}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] text-[var(--text-tertiary)]">Signed in as</p>
                <p className="truncate text-[14px] font-semibold text-white">{userEmail}</p>
              </div>
            </div>
          </section>

          {children ? (
            <section aria-labelledby="overview-preferences-heading">
              <div className="mb-3">
                <p className="label-caps text-[var(--accent-focus)]">Dashboard</p>
                <h3 className="mt-1 text-[18px] font-semibold" id="overview-preferences-heading">
                  Overview preferences
                </h3>
              </div>
              {children}
            </section>
          ) : null}

          <form action="/auth/logout" className="border-t border-[var(--border-subtle)] pt-5" method="post">
            <button
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] border border-[color-mix(in_srgb,var(--danger)_28%,transparent)] bg-[color-mix(in_srgb,var(--danger)_9%,transparent)] px-4 text-[13px] font-semibold text-[#ffd7d3] transition hover:bg-[color-mix(in_srgb,var(--danger)_14%,transparent)]"
              type="submit"
            >
              <LogoutIcon />
              Log out of Orbit
            </button>
          </form>
        </div>
      </dialog>
    </>
  );
}

function SettingsIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="8" cy="17" r="2" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M10 17 15 12 10 7" />
      <path d="M15 12H3" />
      <path d="M21 3v18" />
    </svg>
  );
}
