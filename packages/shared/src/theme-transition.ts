/**
 * Theme switch with a circular reveal growing from the click point
 * (View Transitions API). Falls back to a plain apply when unsupported.
 * Needs the ::view-transition CSS block in the app's globals.css.
 * Browser-only — not exported from the package index.
 */
export function revealTheme(
  origin: { clientX: number; clientY: number },
  apply: () => void,
) {
  if (!document.startViewTransition) return apply();

  const { clientX: x, clientY: y } = origin;
  const r = Math.hypot(
    Math.max(x, innerWidth - x),
    Math.max(y, innerHeight - y),
  );
  // body has transition-colors; freeze it so the new snapshot is painted
  // with final colors immediately, else the reveal crossfades wrongly.
  document.documentElement.classList.add('vt-active');
  const t = document.startViewTransition(apply);
  t.finished.finally(() =>
    document.documentElement.classList.remove('vt-active'),
  );
  t.ready.then(() => {
    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${r}px at ${x}px ${y}px)`,
        ],
      },
      {
        duration: 450,
        easing: 'ease-in-out',
        pseudoElement: '::view-transition-new(root)',
      },
    );
  });
}
