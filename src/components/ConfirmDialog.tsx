"use client";

import { useEffect, useId, useRef, useState } from "react";

type ActionResult = { ok: true } | { ok: false; error: string };

export function ConfirmDialog({
  confirmationPhrase,
  confirmLabel,
  description,
  onConfirm,
  onSuccess,
  title,
  triggerClassName,
  triggerLabel,
}: {
  confirmationPhrase?: string;
  confirmLabel: string;
  description: string;
  onConfirm: () => Promise<ActionResult>;
  onSuccess?: () => void;
  title: string;
  triggerClassName: string;
  triggerLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const cancelButton = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const phraseInput = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (open && !node.open) {
      node.showModal();
      const frame = window.requestAnimationFrame(() => {
        (phraseInput.current ?? cancelButton.current)?.focus();
      });
      return () => window.cancelAnimationFrame(frame);
    }
    if (!open && node.open) node.close();
  }, [open]);

  async function confirm() {
    setPending(true);
    setError("");
    try {
      const result = await onConfirm();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      setPhrase("");
      onSuccess?.();
    } catch {
      setError("The action could not be completed. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        className={`${triggerClassName} min-h-11`}
        onClick={() => {
          setError("");
          setPhrase("");
          setOpen(true);
        }}
        ref={trigger}
        type="button"
      >
        {triggerLabel}
      </button>
      <dialog
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        className="glass-modal modal-animate m-auto max-h-[calc(100dvh-2rem)] w-[min(calc(100%-2rem),28rem)] overflow-y-auto rounded-[24px] border-0 p-6 text-left text-[var(--text-primary)] backdrop:bg-black/70 backdrop:backdrop-blur-sm"
        onCancel={(event) => {
          if (pending) {
            event.preventDefault();
            return;
          }
          setOpen(false);
        }}
        onClick={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          const outside =
            event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom;
          if (outside && !pending) setOpen(false);
        }}
        onClose={() => {
          setOpen(false);
          window.requestAnimationFrame(() => trigger.current?.focus());
        }}
        ref={dialog}
        role="alertdialog"
      >
        <p className="label-caps text-[#ff9fca]">Please confirm</p>
        <h2 className="mt-3 text-[24px] font-semibold text-white" id={titleId}>
          {title}
        </h2>
        <p className="mt-3 text-[14px] leading-6 text-[var(--text-secondary)]" id={descriptionId}>
          {description}
        </p>
        {confirmationPhrase ? (
          <label className="mt-5 grid gap-2">
            <span className="text-[12px] font-semibold text-[var(--text-secondary)]">
              Type <strong className="text-white">{confirmationPhrase}</strong> to continue
            </span>
            <input
              autoComplete="off"
              className="field-input"
              onChange={(event) => setPhrase(event.target.value)}
              ref={phraseInput}
              value={phrase}
            />
          </label>
        ) : null}
        {error ? (
          <p
            aria-live="assertive"
            className="mt-4 text-[13px] font-semibold text-[var(--danger)]"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        <div className="mt-6 flex justify-end gap-3">
          <button
            className="min-h-11 rounded-[12px] border border-white/10 px-4 py-2.5 text-[13px] font-semibold text-[var(--text-secondary)]"
            disabled={pending}
            onClick={() => setOpen(false)}
            ref={cancelButton}
            type="button"
          >
            Cancel
          </button>
          <button
            aria-busy={pending}
            className="min-h-11 rounded-[12px] bg-[var(--danger)] px-4 py-2.5 text-[13px] font-bold text-[#3b0908] disabled:cursor-not-allowed disabled:opacity-45"
            disabled={
              pending ||
              Boolean(confirmationPhrase && phrase !== confirmationPhrase)
            }
            onClick={confirm}
            type="button"
          >
            {pending ? "Working…" : confirmLabel}
          </button>
        </div>
      </dialog>
    </>
  );
}
