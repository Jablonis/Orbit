import assert from "node:assert/strict";
import test from "node:test";
import {
  PALETTE_COOKIE,
  THEME_COOKIE,
  paletteAttribute,
  paletteChoices,
  parsePalette,
  parseTheme,
  themeAttribute,
  themeChoices,
} from "../src/lib/theme";

test("an unknown or absent theme falls back to following the system", () => {
  assert.equal(parseTheme("dark"), "dark");
  assert.equal(parseTheme("light"), "light");
  assert.equal(parseTheme("system"), "system");
  assert.equal(parseTheme(undefined), "system");
  assert.equal(parseTheme(null), "system");
  // A cookie is user-editable, so anything at all can arrive here.
  assert.equal(parseTheme("DARK"), "system");
  assert.equal(parseTheme("'; drop table"), "system");
});

test("an unknown or absent palette falls back to the one that always shipped", () => {
  assert.equal(parsePalette("instrument"), "instrument");
  assert.equal(parsePalette("orbit"), "orbit");
  assert.equal(parsePalette(undefined), "orbit");
  assert.equal(parsePalette("Instrument"), "orbit");
  assert.equal(parsePalette("../../etc"), "orbit");
});

test("the default of each axis carries no stamp", () => {
  // The absence of an attribute is what lets the stylesheet answer
  // prefers-color-scheme on its own, and what keeps Orbit's own selectors at
  // their original specificity.
  assert.equal(themeAttribute("system"), undefined);
  assert.equal(themeAttribute("dark"), "dark");
  assert.equal(themeAttribute("light"), "light");
  assert.equal(paletteAttribute("orbit"), undefined);
  assert.equal(paletteAttribute("instrument"), "instrument");
});

test("the two axes are stored separately", () => {
  // Choosing a palette must not silently undo a chosen theme, which sharing a
  // cookie would make very easy to do by accident.
  assert.notEqual(THEME_COOKIE, PALETTE_COOKIE);
});

test("every choice of both axes is a value the parser accepts back", () => {
  for (const choice of themeChoices) assert.equal(parseTheme(choice), choice);
  for (const choice of paletteChoices) assert.equal(parsePalette(choice), choice);
});
