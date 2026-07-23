import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("the global shell exposes a visible-on-focus skip link", () => {
  const layout = read("src/app/layout.tsx");
  const styles = read("src/app/globals.css");

  assert.match(layout, /className="skip-link" href="#main-content"/);
  assert.match(
    styles,
    /\.skip-link:focus\s*\{[\s\S]*?translateY\(0\)/,
  );
});

test("every primary page exposes the shared main-content target", () => {
  const pages = [
    "src/app/page.tsx",
    "src/app/tasks/page.tsx",
    "src/app/fitness/page.tsx",
    "src/app/finance/page.tsx",
    "src/app/login/page.tsx",
    "src/app/ui-lab/page.tsx",
  ];

  for (const page of pages) {
    assert.match(read(page), /id="main-content"/, `${page} needs the skip target`);
    assert.match(read(page), /tabIndex=\{-1\}/, `${page} needs a focusable main`);
  }
});

test("every route exposes one page heading and a descriptive title", () => {
  const routes = [
    {
      content: "src/app/page.tsx",
      metadata: "src/app/page.tsx",
      title: "Overview",
    },
    {
      content: "src/app/tasks/TasksClient.tsx",
      metadata: "src/app/tasks/page.tsx",
      title: "Tasks",
    },
    {
      content: "src/app/fitness/FitnessClient.tsx",
      metadata: "src/app/fitness/page.tsx",
      title: "Fitness",
    },
    {
      content: "src/app/finance/FinanceClient.tsx",
      metadata: "src/app/finance/page.tsx",
      title: "Finance",
    },
    {
      content: "src/app/login/page.tsx",
      metadata: "src/app/login/page.tsx",
      title: "Sign in",
    },
    {
      content: "src/app/ui-lab/page.tsx",
      metadata: "src/app/ui-lab/page.tsx",
      title: "UI lab",
      usesPageHeader: true,
    },
  ];

  for (const route of routes) {
    if (route.usesPageHeader) {
      assert.match(read(route.content), /<PageHeader\b/);
    } else {
      assert.equal(
        [...read(route.content).matchAll(/<h1\b/g)].length,
        1,
        `${route.content} must expose one h1`,
      );
    }
    assert.match(
      read(route.metadata),
      new RegExp(`title: "${route.title}"`),
      `${route.metadata} needs a descriptive route title`,
    );
  }
});

test("global pixel typography never drops below the metadata floor", () => {
  const styles = read("src/app/globals.css");
  const pixelSizes = [...styles.matchAll(/font-size:\s*(\d+)px/g)].map((match) =>
    Number(match[1]),
  );

  assert.ok(pixelSizes.length > 0);
  assert.equal(
    pixelSizes.filter((size) => size < 12).length,
    0,
    "essential global type roles must stay at or above 12px",
  );
});

test("dashboard customization controls use enhanced touch targets", () => {
  const customizer = read("src/components/DashboardCustomizer.tsx");

  assert.doesNotMatch(customizer, /\bh-8\b|\bw-8\b|\bw-7\b/);
  assert.match(customizer, /h-11 w-11/);
});

test("global feedback is viewport-anchored and settings expose save states", () => {
  const toast = read("src/components/ActionToast.tsx");
  const customizer = read("src/components/DashboardCustomizer.tsx");

  assert.match(toast, /createPortal\(toast, document\.body\)/);
  assert.match(toast, /inset-x-4/);
  assert.match(customizer, /Unsaved changes/);
  assert.match(customizer, /Saving Orbit settings/);
  assert.match(customizer, /Save changes/);
});

test("the mobile task editor uses the native modal dialog contract", () => {
  const tasks = read("src/app/tasks/TasksClient.tsx");

  assert.match(tasks, /<dialog/);
  assert.match(tasks, /aria-labelledby="task-editor-title"/);
  assert.match(tasks, /\.showModal\(\)/);
  assert.match(tasks, /onCancel=/);
  assert.match(tasks, /backdrop:bg-black/);
});

test("the protected UI lab exercises the canonical primitive layer", () => {
  const lab = read("src/app/ui-lab/page.tsx");
  const proxy = read("src/lib/supabase/proxy.ts");

  assert.match(proxy, /"\/ui-lab"/);
  for (const primitive of [
    "PageHeader",
    "Surface",
    "Button",
    "Field",
    "SegmentedControl",
    "FilterChip",
    "ListRow",
    "TableShell",
    "InlineFeedback",
    "Skeleton",
  ]) {
    assert.match(lab, new RegExp(`<${primitive}\\b`));
  }
});

test("the UI quality matrix covers reflow, zoom, routes, and dense states", () => {
  const quality = JSON.parse(read("ui-quality.config.json")) as {
    dataStates: string[];
    routes: string[];
    viewports: Array<{ width: number }>;
    zoomLevels: number[];
  };

  assert.deepEqual(
    quality.viewports.map((viewport) => viewport.width),
    [320, 375, 430, 768, 1024, 1440],
  );
  assert.ok(quality.zoomLevels.includes(2));
  assert.deepEqual(
    ["/", "/tasks", "/fitness", "/finance"].filter(
      (route) => !quality.routes.includes(route),
    ),
    [],
  );
  assert.ok(quality.dataStates.includes("dense"));
  assert.ok(quality.dataStates.includes("long-content"));
});
