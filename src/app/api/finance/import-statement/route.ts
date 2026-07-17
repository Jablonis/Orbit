import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  parseBankStatementText,
  statementFingerprintPayload,
} from "@/lib/bank-statement";
import { extractBankStatementText } from "@/lib/pdf-statement.server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 20;

const maxPdfBytes = 4 * 1024 * 1024;
const maxRequestBytes = maxPdfBytes + 32 * 1024;

export async function POST(request: NextRequest) {
  if (!hasTrustedOrigin(request)) {
    return json({ error: "Untrusted upload origin." }, 403);
  }

  const contentType = request.headers.get("content-type") ?? "";
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (!contentType.toLocaleLowerCase().startsWith("multipart/form-data")) {
    return json({ error: "Use a multipart PDF upload." }, 415);
  }
  if (contentLength > maxRequestBytes) {
    return json({ error: "The PDF must be smaller than 4 MB." }, 413);
  }

  // This is the authorization boundary. The API path deliberately avoids page
  // redirects so expired sessions still receive JSON instead of login HTML.
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return json({ error: "Your session expired. Sign in again before importing a statement." }, 401);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return json({ error: "The upload could not be read." }, 400);
  }

  const file = formData.get("statement");
  const statementMonth = String(formData.get("statementMonth") ?? "");
  const mode = String(formData.get("mode") ?? "preview");

  if (!(file instanceof File)) {
    return json({ error: "Choose a PDF statement." }, 400);
  }
  const monthNumber = Number(statementMonth.slice(5, 7));
  if (!/^\d{4}-\d{2}$/.test(statementMonth) || monthNumber < 1 || monthNumber > 12) {
    return json({ error: "Choose a valid statement month." }, 400);
  }
  if (mode !== "preview" && mode !== "import") {
    return json({ error: "Invalid import mode." }, 400);
  }
  if (file.size === 0 || file.size > maxPdfBytes) {
    return json({ error: "The PDF must be between 1 byte and 4 MB." }, 413);
  }
  const allowedMime = file.type === "application/pdf" || file.type === "application/octet-stream";
  if (!allowedMime || !file.name.toLocaleLowerCase().endsWith(".pdf")) {
    return json({ error: "Only PDF bank statements are accepted." }, 415);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (new TextDecoder("ascii").decode(bytes.slice(0, 5)) !== "%PDF-") {
    return json({ error: "The uploaded file is not a valid PDF." }, 415);
  }

  try {
    const extracted = await extractBankStatementText(bytes);
    const preview = parseBankStatementText(extracted.text, statementMonth);
    const fingerprint = createHash("sha256")
      .update(statementFingerprintPayload(statementMonth, preview.rows))
      .digest("hex");
    const { data: duplicate } = await supabase
      .from("finance_statement_imports")
      .select("id,statement_month")
      .eq("user_id", user.id)
      .eq("fingerprint", fingerprint)
      .maybeSingle();

    if (duplicate) {
      return json(
        { error: `This statement was already imported for ${duplicate.statement_month.slice(0, 7)}.` },
        409,
      );
    }

    if (mode === "preview") {
      return json({
        ...preview,
        pages: extracted.pages,
        statementMonth,
      });
    }

    const { data, error } = await supabase.rpc("import_finance_statement", {
      p_currency: "EUR",
      p_fingerprint: fingerprint,
      p_rows: preview.rows,
      p_statement_month: `${statementMonth}-01`,
    });
    if (error) {
      if (error.code === "23505") {
        return json({ error: "This statement has already been imported." }, 409);
      }
      throw new Error(error.message);
    }

    return json({
      import: data,
      message: `${preview.rows.length} transactions imported securely.`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The statement could not be processed.";
    return json({ error: safeErrorMessage(message) }, 422);
  }
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

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
    status,
  });
}

function safeErrorMessage(message: string) {
  const allowed = [
    "Bank statements are limited",
    "Choose a valid statement month",
    "No transactions were detected",
    "Remove the PDF password",
    "The extracted statement text is too large",
    "This PDF has no readable transaction text",
  ];
  return allowed.some((prefix) => message.startsWith(prefix))
    ? message
    : "The bank statement could not be parsed safely. Export a text-based PDF from your bank app and try again.";
}
