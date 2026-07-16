"use client";

import { useEffect, useId, useState } from "react";

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
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) setOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open, pending]);

  async function confirm() {
    setPending(true);
    setError("");
    const result = await onConfirm();
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    setPhrase("");
    onSuccess?.();
  }

  return (
    <>
      <button className={triggerClassName} onClick={() => setOpen(true)} type="button">
        {triggerLabel}
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !pending) setOpen(false);
          }}
        >
          <section
            aria-describedby={descriptionId}
            aria-labelledby={titleId}
            aria-modal="true"
            className="glass-modal modal-animate w-full max-w-md rounded-[24px] p-6"
            role="alertdialog"
          >
            <p className="label-caps text-[#ff9fca]">Please confirm</p>
            <h2 className="mt-3 text-[24px] font-semibold text-white" id={titleId}>
              {title}
            </h2>
            <p className="mt-3 text-[14px] leading-6 text-[#c4c7c8]" id={descriptionId}>
              {description}
            </p>
            {confirmationPhrase ? (
              <label className="mt-5 grid gap-2">
                <span className="text-[12px] font-semibold text-[#c4c7c8]">
                  Type <strong className="text-white">{confirmationPhrase}</strong> to continue
                </span>
                <input
                  autoFocus
                  className="field-input"
                  onChange={(event) => setPhrase(event.target.value)}
                  value={phrase}
                />
              </label>
            ) : null}
            {error ? (
              <p className="mt-4 text-[13px] font-semibold text-[#fb7185]" role="alert">
                {error}
              </p>
            ) : null}
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="rounded-[12px] border border-white/10 px-4 py-2.5 text-[13px] font-semibold text-[#c4c7c8]"
                disabled={pending}
                onClick={() => setOpen(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-[12px] bg-[#ffb4ab] px-4 py-2.5 text-[13px] font-bold text-[#3b0908] disabled:cursor-not-allowed disabled:opacity-45"
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
          </section>
        </div>
      ) : null}
    </>
  );
}
