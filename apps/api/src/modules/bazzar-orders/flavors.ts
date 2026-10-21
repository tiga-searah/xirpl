export const FLAVORS = ['pedas', 'balado', 'manis', 'original'] as const;
const flavorSet = new Set<string>(FLAVORS);

/**
 * Each entry is one pangsit's picks ("pedas", "original", or "pedas+manis" when mixed).
 * Unknown tokens are dropped, repeats inside an entry collapse.
 */
export const normalizeFlavors = (flavors: string[] | undefined) =>
  (flavors ?? [])
    .map((entry) => {
      const tokens = [
        ...new Set(
          entry
            .toLowerCase()
            .split('+')
            .map((f) => f.trim()),
        ),
      ].filter((f) => flavorSet.has(f));
      if (tokens.length === 0 || tokens.includes('original')) {
        return 'original';
      }
      return tokens.join('+');
    })
    .filter(Boolean)
    .slice(0, 214748);
