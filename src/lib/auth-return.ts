const allowedReturnRoutes = [
  "/tasks",
  "/fitness",
  "/finance",
  "/reset-password",
  "/ui-lab",
] as const;

export function getSafeReturnPath(
  value: string | string[] | null | undefined,
  fallback = "/",
) {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (
    !candidate ||
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(candidate)
  ) {
    return fallback;
  }

  try {
    const url = new URL(candidate, "https://orbit.local");
    const allowed =
      url.pathname === "/" ||
      allowedReturnRoutes.some(
        (route) =>
          url.pathname === route || url.pathname.startsWith(`${route}/`),
      );

    if (!allowed || url.origin !== "https://orbit.local") return fallback;
    return `${url.pathname}${url.search}`;
  } catch {
    return fallback;
  }
}
