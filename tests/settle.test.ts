import assert from "node:assert/strict";
import test from "node:test";
import { collectTrouble, settle } from "../src/lib/settle";

test("a working loader passes through untouched", async () => {
  const result = await settle("tasks", Promise.resolve([1, 2]), []);
  assert.deepEqual(result, { trouble: "", value: [1, 2] });
});

test("a failing loader yields its fallback and says why", async () => {
  const result = await settle(
    "finance",
    Promise.reject(new Error("relation does not exist")),
    "fallback",
  );
  assert.equal(result.value, "fallback");
  assert.equal(result.trouble, "finance: relation does not exist");
});

test("one failing loader cannot take the batch down", async () => {
  // The exact shape the Overview uses: a Promise.all over settled loaders.
  const [a, b, c] = await Promise.all([
    settle("a", Promise.resolve(1), 0),
    settle("b", Promise.reject(new Error("boom")), 0),
    settle("c", Promise.resolve(3), 0),
  ]);

  assert.deepEqual([a.value, b.value, c.value], [1, 0, 3]);
  assert.deepEqual(collectTrouble([a, b, c]), ["b: boom"]);
});
