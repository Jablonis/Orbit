import { NextResponse, type NextRequest } from "next/server";
import { getSafeReturnPath } from "@/lib/auth-return";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const nextPath = getSafeReturnPath(
    request.nextUrl.searchParams.get("next"),
    "/reset-password",
  );

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(nextPath, request.url));
    }
  }

  return NextResponse.redirect(new URL("/login?recovery=expired", request.url));
}
