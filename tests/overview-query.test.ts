import assert from "node:assert/strict";
import test from "node:test";
import { getOverviewHref } from "../src/lib/overview-query";

const current = {
  brief: "weekly" as const,
  domains: "tasks,focus",
  tasks: "overdue" as const,
};

test("task filters preserve the Brief period and score domains", () => {
  assert.equal(
    getOverviewHref(current, { tasks: "upcoming" }),
    "/?brief=weekly&tasks=upcoming&domains=tasks%2Cfocus",
  );
});

test("domain controls preserve the Brief period and task filter", () => {
  assert.equal(
    getOverviewHref(current, { domains: "fitness" }),
    "/?brief=weekly&tasks=overdue&domains=fitness",
  );
});

test("Brief controls preserve the task filter and explicit empty domains", () => {
  assert.equal(
    getOverviewHref(current, { brief: "daily", domains: "none" }),
    "/?brief=daily&tasks=overdue&domains=none",
  );
});
