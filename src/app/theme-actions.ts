"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  THEME_COOKIE,
  THEME_COOKIE_MAX_AGE,
  type ThemeChoice,
  parseTheme,
} from "@/lib/theme";

/**
 * Store the theme choice. It is a display preference and nothing else, so it
 * does not go near the database or the session — a cookie the layout reads is
 * the whole mechanism.
 */
export async function setThemeAction(value: ThemeChoice) {
  const choice = parseTheme(value);
  const jar = await cookies();

  if (choice === "system") {
    jar.delete(THEME_COOKIE);
  } else {
    jar.set(THEME_COOKIE, choice, {
      httpOnly: false,
      maxAge: THEME_COOKIE_MAX_AGE,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  revalidatePath("/", "layout");
}
