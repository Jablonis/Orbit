import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getTasks,
  isMissingRoutineColumn,
  withoutRoutineColumn,
} from "../src/lib/tasks";

const missingColumn = {
  code: "42703",
  message: 'column tasks.repeat_days does not exist',
};

const row = {
  category: "Work",
  completed: false,
  complexity: "medium",
  created_at: "2026-08-01T08:00:00Z",
  due_date: null,
  estimate_minutes: 60,
  estimate_mode: "1hr",
  id: "task-1",
  note: null,
  priority: "normal",
  time_from: null,
  time_to: null,
  title: "Send the invoice",
  type: "deep-work",
};

/**
 * A Supabase stand-in that answers whatever the chain ends on, and records the
 * column lists it was asked for.
 */
function client(answer: (columns: string) => { data: unknown; error: unknown }) {
  const asked: string[] = [];
  const chain = (columns: string) => {
    const result = answer(columns);
    const link: Record<string, unknown> = {
      then: (resolve: (value: unknown) => unknown) => resolve(result),
    };
    for (const method of ["eq", "is", "not", "order", "limit"]) {
      link[method] = () => link;
    }
    return link;
  };

  return {
    asked,
    supabase: {
      from: () => ({
        select: (columns: string) => {
          asked.push(columns);
          return chain(columns);
        },
      }),
    } as unknown as SupabaseClient,
  };
}

test("a database without the routines column still loads the tasks", async () => {
  const { asked, supabase } = client((columns) =>
    columns.includes("repeat_days")
      ? { data: null, error: missingColumn }
      : { data: [row], error: null },
  );

  const tasks = await getTasks(supabase, "user-1", { includeHistory: true });

  assert.equal(asked.length, 2, "asked again without the column");
  assert.equal(tasks.length, 1);
  assert.deepEqual(tasks[0].repeatDays, [], "no column means no routines");
});

test("a real database error is still an error", async () => {
  const { supabase } = client(() => ({
    data: null,
    error: { code: "42P01", message: "relation tasks does not exist" },
  }));

  await assert.rejects(
    () => getTasks(supabase, "user-1", { includeHistory: true }),
    /relation tasks does not exist/,
  );
});

test("only the routines column is forgiven, and only where it is named", () => {
  assert.equal(isMissingRoutineColumn(missingColumn), true);
  assert.equal(
    isMissingRoutineColumn({ code: "42703", message: "column tasks.note does not exist" }),
    false,
  );
  assert.equal(isMissingRoutineColumn(null), false);
  assert.deepEqual(withoutRoutineColumn({ repeat_days: [1], title: "x" }), {
    title: "x",
  });
});
