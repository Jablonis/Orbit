import geometry from "@/lib/body-map.json";
import type { MuscleGroup } from "@/lib/exercises";
import { MUSCLE_GROUPS } from "@/lib/exercises";

/**
 * The body, as a diagram.
 *
 * The coverage grid answers "is every muscle group trained twice a week" with
 * ten cells and a number in each, which is exact and takes a moment to read.
 * This answers the same question in the shape of the thing being trained, so
 * an empty back or a pair of untouched calves is visible before it is read.
 *
 * ## Where the outlines come from
 *
 * The path data is derived from [MuscleMap](https://github.com/melihcolpan/MuscleMap)
 * by Melih Colpan, used under the **MIT Licence**. MuscleMap ships its geometry
 * as Swift source rather than SVG; the conversion to JSON, and the dropping of
 * its sub-group shapes, follow openGym's `frontend/src/lib/body-paths.js`,
 * which carries the same MIT notice. Nothing about the artwork was changed.
 *
 * ```
 * MIT License — Copyright (c) 2026 Melih Colpan
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 * ```
 *
 * One body is shipped, not two. It is a diagram of muscle groups rather than a
 * picture of anyone, and a second silhouette with no setting to choose it would
 * be 40 kB nobody can reach.
 */

export type BodyView = {
  /** Muscle slug to the outlines that draw it. */
  p: Record<string, string[]>;
  /** The SVG viewBox this view's coordinates are in. */
  vb: string;
};

const views = geometry as { back: BodyView; front: BodyView };

export const BODY_FRONT: BodyView = views.front;
export const BODY_BACK: BodyView = views.back;

/**
 * Drawn as the silhouette and never shaded: they carry no training load, and
 * a coloured-in head would suggest the diagram means something it does not.
 */
export const INERT_PARTS = [
  "head",
  "hair",
  "neck",
  "hands",
  "feet",
  "knees",
  "ankles",
];

/**
 * Orbit's ten groups, spread over the eighteen shapes the diagram can draw.
 *
 * The direction is the same one `exercises.ts` chose: forearms belong to the
 * arm that curls, traps and lats to the back, hip flexors and obliques to the
 * core. Every shape the diagram can draw is claimed by exactly one group,
 * which is what makes shading it honest — a muscle that two groups both
 * lit up would read as trained twice for one session.
 */
export const MUSCLE_SHAPES: Record<MuscleGroup, string[]> = {
  back: ["upper-back", "lower-back", "trapezius"],
  biceps: ["biceps", "forearm"],
  calves: ["calves", "tibialis"],
  chest: ["chest", "serratus"],
  core: ["abs", "obliques", "hip-flexors"],
  glutes: ["gluteal"],
  hamstrings: ["hamstring"],
  quads: ["quadriceps", "adductors"],
  shoulders: ["deltoids"],
  triceps: ["triceps"],
};

/** The group a shape belongs to, or null for a silhouette part. */
const shapeToGroup = new Map<string, MuscleGroup>();
for (const group of MUSCLE_GROUPS) {
  for (const shape of MUSCLE_SHAPES[group]) shapeToGroup.set(shape, group);
}

export function groupForShape(shape: string): MuscleGroup | null {
  return shapeToGroup.get(shape) ?? null;
}

/**
 * How hard a group was worked, on a scale of nothing to met-and-then-some.
 *
 * Five steps, because the eye can tell five apart on a small shape and not
 * nine, and because the rule this is drawn against has one threshold in it:
 * step 3 is exactly the twice-a-week target, so "pale" and "solid" mean
 * "short" and "there" rather than "less" and "more".
 */
export function heatLevel(sessions: number, target: number): 0 | 1 | 2 | 3 | 4 {
  if (sessions <= 0) return 0;
  if (sessions >= target * 2) return 4;
  if (sessions >= target) return 3;
  if (sessions >= target / 2) return 2;
  return 1;
}
