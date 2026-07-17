import type { NextRequest } from "next/server";
import { POST as processStatementUpload } from "@/app/api/finance/import-statement/route";

export const runtime = "nodejs";
export const maxDuration = 20;

export async function POST(request: NextRequest) {
  return processStatementUpload(request);
}
