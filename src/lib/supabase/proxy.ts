import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSafeReturnPath } from "@/lib/auth-return";
import { getSupabaseEnv } from "./env";

/**
 * Routes a signed-out visitor is turned away from here, at the edge.
 *
 * Every one of these pages also calls `getAuthenticatedUser`, so the data is
 * never reachable either way. The difference is what a signed-out visit looks
 * like: turned away here it is one clean redirect to the login form carrying
 * where you were going, while a page left off this list renders far enough to
 * flush its shell before the redirect throws, and the visitor gets a flash of
 * empty chrome and loses the destination. A route added to the app and not to
 * this list is the bug — which is what happened to /habits and /crew.
 */
const protectedRoutes = [
  "/",
  "/tasks",
  "/fitness",
  "/habits",
  "/finance",
  "/crew",
  "/reset-password",
  "/ui-lab",
];
const jsonUploadRoutes = new Set(["/api/finance/import-statement"]);

function isProtectedPath(pathname: string) {
  if (jsonUploadRoutes.has(pathname)) return false;

  return protectedRoutes.some(
    (route) => pathname === route || (route !== "/" && pathname.startsWith(`${route}/`)),
  );
}

export async function updateSession(
  request: NextRequest,
  requestHeaders: Headers = request.headers,
) {
  // A signed-out visitor at the root sees the product, not a login wall.
  const marketingRedirect = () =>
    NextResponse.redirect(new URL("/welcome", request.url));
  const loginRedirect = () => {
    const loginUrl = new URL("/login", request.url);
    const intendedPath = getSafeReturnPath(
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
    loginUrl.searchParams.set("next", intendedPath);
    return NextResponse.redirect(loginUrl);
  };
  let response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  let env: ReturnType<typeof getSupabaseEnv>;

  try {
    env = getSupabaseEnv();
  } catch {
    if (request.nextUrl.pathname === "/") return marketingRedirect();
    if (isProtectedPath(request.nextUrl.pathname)) {
      return loginRedirect();
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
        response = NextResponse.next({
          request: { headers: requestHeaders },
        });
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

  if (!claims && pathname === "/") {
    return marketingRedirect();
  }

  if (!claims && isProtectedPath(pathname)) {
    return loginRedirect();
  }

  if (claims && pathname === "/login") {
    return NextResponse.redirect(
      new URL(getSafeReturnPath(request.nextUrl.searchParams.get("next")), request.url),
    );
  }

  return response;
}
