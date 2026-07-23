import "server-only";

import { randomUUID } from "node:crypto";

export type OrbitOperation =
  | "finance.archive"
  | "finance.restore"
  | "finance.statement_import"
  | "tasks.archive"
  | "tasks.restore";

type OperationResult = {
  mode?: "import" | "preview";
  pageCount?: number;
  rowCount?: number;
  status: number;
};

export function startOperation(operation: OrbitOperation) {
  const requestId = randomUUID();
  const startedAt = performance.now();
  let finished = false;

  return {
    finish(result: string, details: OperationResult) {
      if (finished) return;
      finished = true;

      const entry = JSON.stringify({
        duration_ms: Math.max(0, Math.round(performance.now() - startedAt)),
        event: "orbit.operation.completed",
        level: details.status >= 500 ? "error" : "info",
        mode: details.mode,
        operation,
        page_count: normalizeCount(details.pageCount),
        request_id: requestId,
        result,
        row_count: normalizeCount(details.rowCount),
        status_code: details.status,
      });

      if (details.status >= 500) {
        console.error(entry);
      } else {
        console.info(entry);
      }
    },
    requestId,
  };
}

function normalizeCount(value: number | undefined) {
  return Number.isSafeInteger(value) && (value ?? -1) >= 0 ? value : undefined;
}
