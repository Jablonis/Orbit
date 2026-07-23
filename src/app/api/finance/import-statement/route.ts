import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  applyStatementCategoryOverrides,
  parseBankStatementText,
  statementFingerprintPayload,
} from "@/lib/bank-statement";
import { startOperation } from "@/lib/operation-log.server";
import { extractBankStatementText } from "@/lib/pdf-statement.server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 20;

const maxPdfBytes = 4 * 1024 * 1024;
const maxRequestBytes = maxPdfBytes + 32 * 1024;

export async function POST(request: NextRequest) {
  const operation = startOperation("finance.statement_import");

  try {
    return await processStatementUpload(request, operation);
  } catch {
    return statementJson(
      operation,
      "unexpected_error",
      { error: "The secure upload service could not start. Refresh the page and try again." },
      500,
    );
  }
}

async function processStatementUpload(
  request: NextRequest,
  operation: ReturnType<typeof startOperation>,
) {
  if (!hasTrustedOrigin(request)) {
    return statementJson(operation, "untrusted_origin", { error: "Untrusted upload origin." }, 403);
  }

  const contentType = request.headers.get("content-type") ?? "";
  const contentLengthHeader = request.headers.get("content-length");
  if (!contentType.toLocaleLowerCase().startsWith("multipart/form-data")) {
    return statementJson(
      operation,
      "unsupported_content_type",
      { error: "Use a multipart PDF upload." },
      415,
    );
  }
  if (contentLengthHeader) {
    const contentLength = Number(contentLengthHeader);
    if (!Number.isSafeInteger(contentLength) || contentLength < 0) {
      return statementJson(
        operation,
        "invalid_content_length",
        { error: "The upload has an invalid content length." },
        400,
      );
    }
    if (contentLength > maxRequestBytes) {
      return statementJson(
        operation,
        "request_too_large",
        { error: "The PDF must be smaller than 4 MB." },
        413,
      );
    }
  }

  // This is the authorization boundary. Upload paths deliberately avoid page
  // redirects so expired sessions still receive JSON instead of login HTML.
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return statementJson(
      operation,
      "unauthenticated",
      { error: "Your session expired. Sign in again before importing a statement." },
      401,
    );
  }

  const { data: withinRateLimit, error: rateLimitError } = await supabase.rpc(
    "consume_finance_statement_rate_limit",
  );
  if (rateLimitError) {
    return statementJson(
      operation,
      "rate_limit_unavailable",
      { error: "The upload limit could not be checked. Please try again." },
      503,
    );
  }
  if (withinRateLimit !== true) {
    return statementJson(
      operation,
      "rate_limited",
      { error: "Too many statement requests. Try again in 10 minutes." },
      429,
      { "Retry-After": "600" },
    );
  }

  const bodyResult = await readBoundedBody(request, maxRequestBytes);
  if (!bodyResult.ok) {
    return statementJson(
      operation,
      bodyResult.reason === "too-large" ? "request_too_large" : "request_unreadable",
      {
        error: bodyResult.reason === "too-large"
          ? "The PDF must be smaller than 4 MB."
          : "The upload could not be read.",
      },
      bodyResult.reason === "too-large" ? 413 : 400,
    );
  }

  let formData: FormData;
  try {
    const boundedRequest = new Request(request.url, {
      body: bodyResult.bytes,
      headers: request.headers,
      method: "POST",
    });
    formData = await boundedRequest.formData();
  } catch {
    return statementJson(
      operation,
      "invalid_multipart_body",
      { error: "The upload could not be read." },
      400,
    );
  }

  const file = formData.get("statement");
  const rawCategoryOverrides = String(formData.get("categoryOverrides") ?? "");
  const statementMonth = String(formData.get("statementMonth") ?? "");
  const requestedMode = String(formData.get("mode") ?? "preview");

  if (!(file instanceof File)) {
    return statementJson(operation, "missing_file", { error: "Choose a PDF statement." }, 400);
  }
  const monthNumber = Number(statementMonth.slice(5, 7));
  if (!/^\d{4}-\d{2}$/.test(statementMonth) || monthNumber < 1 || monthNumber > 12) {
    return statementJson(
      operation,
      "invalid_statement_month",
      { error: "Choose a valid statement month." },
      400,
    );
  }
  if (requestedMode !== "preview" && requestedMode !== "import") {
    return statementJson(operation, "invalid_mode", { error: "Invalid import mode." }, 400);
  }
  const mode: "import" | "preview" = requestedMode;
  if (file.size === 0 || file.size > maxPdfBytes) {
    return statementJson(
      operation,
      "invalid_file_size",
      { error: "The PDF must be between 1 byte and 4 MB." },
      413,
      {},
      { mode },
    );
  }
  const allowedMime = file.type === "application/pdf" || file.type === "application/octet-stream";
  if (!allowedMime || !file.name.toLocaleLowerCase().endsWith(".pdf")) {
    return statementJson(
      operation,
      "unsupported_file_type",
      { error: "Only PDF bank statements are accepted." },
      415,
      {},
      { mode },
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (new TextDecoder("ascii").decode(bytes.slice(0, 5)) !== "%PDF-") {
    return statementJson(
      operation,
      "invalid_pdf_signature",
      { error: "The uploaded file is not a valid PDF." },
      415,
      {},
      { mode },
    );
  }

  let extracted: Awaited<ReturnType<typeof extractBankStatementText>>;
  let preview: ReturnType<typeof parseBankStatementText>;
  try {
    extracted = await extractBankStatementText(bytes);
    preview = parseBankStatementText(extracted.text, statementMonth);
  } catch (error) {
    const message = error instanceof Error ? error.message : "The statement could not be processed.";
    return statementJson(
      operation,
      "parse_rejected",
      { error: safeErrorMessage(message) },
      422,
      {},
      { mode },
    );
  }

  const metrics = {
    mode,
    pageCount: extracted.pages,
    rowCount: preview.rows.length,
  };
  const fingerprint = createHash("sha256")
    .update(statementFingerprintPayload(statementMonth, preview.rows))
    .digest("hex");
  let importRows = preview.rows;
  if (mode === "import") {
    try {
      importRows = applyStatementCategoryOverrides(
        preview.rows,
        rawCategoryOverrides,
      );
    } catch {
      return statementJson(
        operation,
        "invalid_category_corrections",
        { error: "Review the statement categories and try again." },
        400,
        {},
        metrics,
      );
    }
  }
  const { data: duplicate, error: duplicateLookupError } = await supabase
    .from("finance_statement_imports")
    .select("id,statement_month")
    .eq("user_id", user.id)
    .eq("fingerprint", fingerprint)
    .maybeSingle();

  if (duplicateLookupError) {
    return statementJson(
      operation,
      "duplicate_check_failed",
      { error: "The statement could not be checked safely. Please try again." },
      503,
      {},
      metrics,
    );
  }

  if (duplicate) {
    return statementJson(
      operation,
      "duplicate_statement",
      { error: `This statement was already imported for ${duplicate.statement_month.slice(0, 7)}.` },
      409,
      {},
      metrics,
    );
  }

  if (mode === "preview") {
    return statementJson(
      operation,
      "preview_ready",
      {
        ...preview,
        pages: extracted.pages,
        statementMonth,
      },
      200,
      {},
      metrics,
    );
  }

  const { data, error } = await supabase.rpc("import_finance_statement", {
    p_currency: "EUR",
    p_fingerprint: fingerprint,
    p_rows: importRows,
    p_statement_month: `${statementMonth}-01`,
  });
  if (error) {
    if (error.code === "23505") {
      return statementJson(
        operation,
        "duplicate_statement",
        { error: "This statement has already been imported." },
        409,
        {},
        metrics,
      );
    }
    return statementJson(
      operation,
      "import_failed",
      { error: "The statement could not be imported. Please try again." },
      503,
      {},
      metrics,
    );
  }

  return statementJson(
    operation,
    "import_complete",
    {
      import: data,
      message: `${importRows.length} transactions imported securely.`,
    },
    200,
    {},
    metrics,
  );
}

function hasTrustedOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const expectedHost = forwardedHost || request.headers.get("host");
  if (!origin || !expectedHost) return false;
  if (fetchSite && fetchSite !== "same-origin") return false;

  try {
    return new URL(origin).host === expectedHost;
  } catch {
    return false;
  }
}

async function readBoundedBody(
  request: NextRequest,
  maximumBytes: number,
): Promise<
  | { ok: true; bytes: Uint8Array<ArrayBuffer> }
  | { ok: false; reason: "empty" | "too-large" | "unreadable" }
> {
  if (!request.body) return { ok: false, reason: "empty" };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maximumBytes) {
        await reader.cancel();
        return { ok: false, reason: "too-large" };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, reason: "unreadable" };
  }

  if (totalBytes === 0) return { ok: false, reason: "empty" };

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { bytes, ok: true };
}

function json(
  body: Record<string, unknown>,
  status = 200,
  extraHeaders: Record<string, string> = {},
) {
  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      ...extraHeaders,
    },
    status,
  });
}

function statementJson(
  operation: ReturnType<typeof startOperation>,
  result: string,
  body: Record<string, unknown>,
  status = 200,
  extraHeaders: Record<string, string> = {},
  metrics: {
    mode?: "import" | "preview";
    pageCount?: number;
    rowCount?: number;
  } = {},
) {
  operation.finish(result, { ...metrics, status });
  return json(body, status, {
    "X-Request-Id": operation.requestId,
    ...extraHeaders,
  });
}

function safeErrorMessage(message: string) {
  const allowed = [
    "Bank statements are limited",
    "Choose a valid statement month",
    "No transactions were detected",
    "Remove the PDF password",
    "The extracted statement text is too large",
    "The PDF engine could not start",
    "This PDF has no readable transaction text",
  ];
  return allowed.some((prefix) => message.startsWith(prefix))
    ? message
    : "The bank statement could not be parsed safely. Export a text-based PDF from your bank app and try again.";
}
