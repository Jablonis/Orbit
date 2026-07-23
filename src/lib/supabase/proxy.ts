import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "./env";

const protectedRoutes = ["/", "/tasks", "/fitness", "/finance", "/ui-lab"];
const jsonUploadRoutes = new Set(["/api/finance/import-statement"]);

function isProtectedPath(pathname: string) {
  if (jsonUploadRoutes.has(pathname)) return false;

  return protectedRoutes.some(
    (route) => pathname === route || (route !== "/" && pathname.startsWith(`${route}/`)),
  );
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  let env: ReturnType<typeof getSupabaseEnv>;

  try {
    env = getSupabaseEnv();
  } catch {
    if (isProtectedPath(request.nextUrl.pathname)) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    return response;
  }

  const supabase = createServerClient(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, options, value }) => {
          response.cookies.set(name, value, options);
        });
        Object.entries(headers).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const pathname = request.nextUrl.pathname;

  if (!claims && isProtectedPath(pathname)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (claims && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}
