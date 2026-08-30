/**
 * A loader that is allowed to fail without taking the page with it.
 *
 * The Overview gathers eleven queries in one Promise.all, and seven of the
 * loaders threw on any error — so one missing table blanked the entire app,
 * which is precisely how three separate schema-drift incidents presented.
 * Habits already degraded (rows plus a reason); this is that idea for
 * everything: every loader answers with a value and a sentence, and the page
 * renders what it has while saying what it could not get.
 */

export type Settled<T> = {
  /** Why the fallback is being used, empty when the load succeeded. */
  trouble: string;
  value: T;
};

export async function settle<T>(
  label: string,
  work: Promise<T>,
  fallback: T,
): Promise<Settled<T>> {
  try {
    return { trouble: "", value: await work };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`${label} failed:`, reason);
    return { trouble: `${label}: ${reason}`, value: fallback };
  }
}

/** The sentences worth showing, in the order the loaders were declared. */
export function collectTrouble(settled: Array<{ trouble: string }>) {
  return settled.map((item) => item.trouble).filter(Boolean);
}
