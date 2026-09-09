import { cookies } from "next/headers";
import {
  PALETTE_COOKIE,
  type PaletteChoice,
  THEME_COOKIE,
  type ThemeChoice,
  parsePalette,
  parseTheme,
} from "@/lib/theme";

/**
 * How the app should look, read once.
 *
 * Two cookies and two parses, which every page that draws the navigation
 * needed. Doing it in one place is not only shorter — it is the difference
 * between adding a third appearance choice in one file and adding it in nine.
 *
 * Separate from `theme.ts` because that module is imported by client
 * components for its types, and `next/headers` in that import graph breaks the
 * client build.
 */
export async function getAppearance(): Promise<{
  palette: PaletteChoice;
  theme: ThemeChoice;
}> {
  const jar = await cookies();
  return {
    palette: parsePalette(jar.get(PALETTE_COOKIE)?.value),
    theme: parseTheme(jar.get(THEME_COOKIE)?.value),
  };
}
