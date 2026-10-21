export const FLAVORS = ['pedas', 'balado', 'manis'] as const;
const flavorSet = new Set<string>(FLAVORS);

/**
 * Each entry is one pangsit's picks ("pedas", or "pedas+manis" when mixed).
 * Unknown tokens are dropped, repeats inside an entry collapse.
 */
export const normalizeFlavors = (flavors: string[] | undefined) =>
  (flavors ?? [])
    .map((entry) =>
      [
        ...new Set(
          entry
            .toLowerCase()
            .split('+')
            .map((f) => f.trim()),
        ),
      ]
        .filter((f) => flavorSet.has(f))
        .join('+'),
    )
    .filter(Boolean)
    .slice(0, 214748);
