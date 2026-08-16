/**
 * Does a template's title only name tools its node graph actually contains?
 *
 * Two separate rules lean on this answer - the free tier refuses to hand out a
 * template whose title over-claims, and the price model refuses to charge a top
 * price for one - so the check lives here rather than in either of them.
 *
 * The vocabulary is built from the catalog's own `platforms` lists, never from
 * a hardcoded roster. A hardcoded list goes stale the moment a template starts
 * using a tool nobody remembered to add, and goes stale silently: the check
 * keeps passing and the claim it was meant to catch ships anyway.
 */

export type Titled = { title: string; platforms: string[] };

/** platform name (lowercased) -> a whole-word matcher for it. */
export type PlatformVocabulary = Map<string, RegExp>;

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Every platform name the catalog actually uses, as whole-word matchers. */
export function platformVocabulary(items: Titled[]): PlatformVocabulary {
  const vocabulary: PlatformVocabulary = new Map();
  for (const w of items) {
    for (const p of w.platforms) {
      const name = p.toLowerCase();
      if (!vocabulary.has(name)) {
        vocabulary.set(name, new RegExp(`(^|[^a-z0-9])${escapeRe(name)}([^a-z0-9]|$)`));
      }
    }
  }
  return vocabulary;
}

/** True when every platform the title names is genuinely in the node graph. */
export function titleIsHonest(w: Titled, vocabulary: PlatformVocabulary): boolean {
  const title = w.title.toLowerCase();
  const own = new Set(w.platforms.map((p) => p.toLowerCase()));
  for (const [name, re] of vocabulary) {
    if (!own.has(name) && re.test(title)) return false;
  }
  return true;
}
