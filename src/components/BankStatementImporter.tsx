"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ActionToast } from "@/components/ActionToast";
import type { BankStatementPreview } from "@/lib/bank-statement";
import { formatCurrency } from "@/lib/finance";

type StatementPreviewResponse = BankStatementPreview & {
  pages: number;
  statementMonth: string;
};

type StatementResponse = Partial<StatementPreviewResponse> & {
  error?: string;
  message?: string;
};

export function BankStatementImporter({ initialMonth }: { initialMonth: string }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [month, setMonth] = useState(initialMonth);
  const [pendingMode, setPendingMode] = useState<"import" | "preview" | null>(null);
  const [preview, setPreview] = useState<StatementPreviewResponse | null>(null);

  async function send(mode: "import" | "preview") {
    if (!file) {
      setError("Choose a PDF statement first.");
      return;
    }

    setError("");
    setMessage("");
    setPendingMode(mode);
    const formData = new FormData();
    formData.set("mode", mode);
    formData.set("statement", file);
    formData.set("statementMonth", month);

    try {
      const response = await fetch("/api/finance/import-statement", {
        body: formData,
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        method: "POST",
      });
      const payload = await readStatementResponse(response);
      if (!response.ok) throw new Error(payload.error || "The statement could not be processed.");

      if (mode === "preview") {
        if (!Array.isArray(payload.rows) || typeof payload.pages !== "number") {
          throw new Error("The statement preview was incomplete. Please try again.");
        }
        setPreview(payload as StatementPreviewResponse);
      } else {
        setMessage(payload.message || "Statement imported securely.");
        setPreview(null);
        setFile(null);
        if (fileInput.current) fileInput.current.value = "";
        router.refresh();
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "The statement could not be processed.",
      );
    } finally {
      setPendingMode(null);
    }
  }

  function resetPreview() {
    setPreview(null);
    setError("");
    setMessage("");
  }

  return (
    <article className="content-panel rounded-[var(--radius-panel)] p-6 xl:col-span-7" id="bank-statement-import">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="label-caps text-[var(--accent-primary)]">Monthly bank PDF</p>
          <h3 className="mt-2 text-[22px] font-semibold text-white">Import a statement</h3>
          <p className="mt-2 max-w-xl text-[12px] leading-5 text-[var(--text-secondary)]">
            Upload a text-based EUR statement, review every detected amount, then confirm the import.
          </p>
        </div>
        <span className="rounded-full border border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/10 px-3 py-1.5 text-[12px] font-semibold text-[#d9f99d]">
          PDF is never stored
        </span>
      </div>

      <form
        className="mt-5 grid gap-3 sm:grid-cols-[1fr_150px_auto]"
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          void send("preview");
        }}
      >
        <label className="grid gap-2">
          <span className="label-caps text-[var(--text-secondary)]">Statement PDF</span>
          <input
            accept=".pdf,application/pdf"
            className="field-input file:mr-4 file:rounded-full file:border-0 file:bg-white file:px-3 file:py-1.5 file:text-[12px] file:font-semibold file:text-[#202020]"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              resetPreview();
            }}
            ref={fileInput}
            required
            type="file"
          />
        </label>
        <label className="grid gap-2">
          <span className="label-caps text-[var(--text-secondary)]">Statement month</span>
          <input
            className="field-input"
            max="2100-12"
            min="2000-01"
            onChange={(event) => {
              setMonth(event.target.value);
              resetPreview();
            }}
            required
            type="month"
            value={month}
          />
        </label>
        <button
          className="min-h-11 self-end rounded-[var(--radius-control)] bg-white px-5 text-[13px] font-bold text-[#202020] disabled:opacity-55"
          disabled={pendingMode !== null}
          type="submit"
        >
          {pendingMode === "preview" ? "Reading…" : "Preview"}
        </button>
      </form>

      <div className="mt-4 flex items-start gap-3 rounded-[var(--radius-row)] border border-[var(--border-subtle)] bg-white/[0.02] p-4">
        <span aria-hidden="true" className="mt-0.5 text-[var(--accent-info)]">◈</span>
        <p className="text-[12px] leading-[18px] text-[var(--text-tertiary)]">
          Orbit validates the file type, size, PDF signature, page count, origin, and signed-in user on the server. It discards the document after parsing and stores only confirmed transactions plus a non-reversible duplicate fingerprint. Account and card numbers found in descriptions are masked.
        </p>
      </div>

      {error ? (
        <p className="mt-4 rounded-[var(--radius-row)] border border-[var(--danger)]/25 bg-[var(--danger)]/10 p-4 text-[12px] leading-5 text-[#ffd7d3]" role="alert">
          {error}
        </p>
      ) : null}

      {preview ? (
        <section aria-labelledby="statement-preview-title" className="mt-6 border-t border-[var(--border-subtle)] pt-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="label-caps text-[var(--text-tertiary)]">Review before import</p>
              <h4 className="mt-1 text-[18px] font-semibold text-white" id="statement-preview-title">
                {preview.rows.length} transactions · {preview.pages} page{preview.pages === 1 ? "" : "s"}
              </h4>
            </div>
            <button
              className="min-h-11 rounded-[var(--radius-control)] bg-[var(--accent-primary)] px-5 text-[13px] font-bold text-[#14200a] disabled:opacity-55"
              disabled={pendingMode !== null}
              onClick={() => void send("import")}
              type="button"
            >
              {pendingMode === "import" ? "Importing…" : "Confirm and import"}
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <PreviewMetric label="Income" value={formatCurrency(preview.income)} />
            <PreviewMetric label="Expenses" value={formatCurrency(preview.expenses)} />
            <PreviewMetric label="Net" value={formatCurrency(preview.net)} />
          </div>

          {preview.warnings.length > 0 ? (
            <div className="mt-4 rounded-[var(--radius-row)] border border-[#f59e0b]/25 bg-[#f59e0b]/10 p-4 text-[12px] leading-[18px] text-[#fde68a]">
              {preview.warnings.map((warning, index) => (
                <p key={`${index}-${warning}`}>• {warning}</p>
              ))}
            </div>
          ) : null}

          <div className="mt-4 max-h-[min(65vh,760px)] overflow-auto rounded-[var(--radius-row)] border border-[var(--border-subtle)]">
            <table className="w-full min-w-[620px] text-left text-[12px]">
              <caption className="sr-only">
                All {preview.rows.length} transactions that will be imported
              </caption>
              <thead className="sticky top-0 z-10 bg-[#191919] text-[var(--text-tertiary)]">
                <tr><th className="px-4 py-3">Date</th><th>Transaction</th><th>Category</th><th className="px-4 text-right">Amount</th></tr>
              </thead>
              <tbody>
                {preview.rows.map((row, index) => (
                  <tr className="border-t border-[var(--border-subtle)]" key={`${index}-${row.date}-${row.title}-${row.amount}`}>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{row.date}</td>
                    <td className="max-w-[280px] truncate pr-4 font-semibold text-white">{row.title}</td>
                    <td className="pr-4 text-[var(--text-secondary)]">{row.category}</td>
                    <td className={`metric-value px-4 text-right font-semibold ${row.amount >= 0 ? "text-[var(--accent-primary)]" : "text-[#ffd7d3]"}`}>
                      {formatCurrency(row.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[12px] text-[var(--text-tertiary)]">
            Showing all {preview.rows.length} transactions. Scroll the ledger to review every row before import.
          </p>
        </section>
      ) : null}

      {message ? <ActionToast message={message} /> : null}
    </article>
  );
}

async function readStatementResponse(response: Response): Promise<StatementResponse> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.toLocaleLowerCase().includes("application/json")) {
    try {
      return await response.json() as StatementResponse;
    } catch {
      return { error: "The server returned an incomplete response. Please try again." };
    }
  }

  if (response.redirected || response.url.endsWith("/login") || response.status === 401) {
    return { error: "Your session expired. Sign in again, then upload the statement." };
  }
  if (response.status === 413) {
    return { error: "The PDF is too large for the secure upload limit." };
  }
  if (response.status === 404) {
    return { error: "The upload endpoint is not available on this deployment yet. Refresh the page and try again." };
  }
  if (response.status >= 500) {
    return { error: "The secure upload service is temporarily unavailable. Please try again." };
  }
  return { error: `The upload service returned an invalid response (${response.status}). Please try again.` };
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-row)] border border-[var(--border-subtle)] bg-white/[0.025] p-4">
      <p className="label-caps text-[var(--text-tertiary)]">{label}</p>
      <p className="metric-value mt-2 text-[18px] font-semibold text-white">{value}</p>
    </div>
  );
}
