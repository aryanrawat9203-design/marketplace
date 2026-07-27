import { getIndex, type IndexItem } from "./catalog";

export const STARTER_PACK_FILENAME = "workflowcrate-starter-pack.zip";

/**
 * The free starter pack is every template flagged `free`, ordered easiest
 * first so the download reads as a ladder rather than a pile. Widening the
 * pack is a pricing decision: flip `free` on more templates in the catalog
 * and they appear here, in the ZIP and on /free automatically.
 */
const DIFFICULTY_ORDER = ["Beginner", "Intermediate", "Advanced", "Expert"];

function difficultyRank(d: string | null): number {
  const i = DIFFICULTY_ORDER.indexOf(d ?? "");
  return i === -1 ? DIFFICULTY_ORDER.length : i;
}

const g = globalThis as unknown as { __starterPack?: IndexItem[] };

export function starterPackItems(): IndexItem[] {
  if (!g.__starterPack) {
    g.__starterPack = getIndex()
      .filter((w) => w.free)
      .sort(
        (a, b) =>
          difficultyRank(a.difficulty) - difficultyRank(b.difficulty) ||
          a.title.localeCompare(b.title),
      );
  }
  return g.__starterPack;
}
