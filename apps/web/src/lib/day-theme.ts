export type DayTheme = 'default' | 'green' | 'yellow';

// Set to 'yellow' | 'green' | 'default' to preview a theme, or null for automatic date mode.
const PREVIEW_DAY_THEME: DayTheme | null = null;

/**
 * Resolve the dynamic color palette for a given local date:
 * - November 25 -> yellow (kuning)
 * - Tuesday (Selasa, day 2) -> green (hijau)
 * - Friday (Jumat, day 5) -> yellow (kuning)
 * - Other days -> default
 */
export function getDayTheme(now: Date = new Date()): DayTheme {
  if (PREVIEW_DAY_THEME) return PREVIEW_DAY_THEME;

  if (now.getMonth() === 10 && now.getDate() === 25) {
    return 'yellow';
  }

  const day = now.getDay();
  if (day === 2) return 'green';
  if (day === 5) return 'yellow';
  return 'default';
}

/**
 * Inline script executed in <head> before first paint to prevent a flash of
 * the default palette on Tuesday, Friday, or November 25.
 */
export const DAY_THEME_INIT_SCRIPT = PREVIEW_DAY_THEME
  ? `document.documentElement.dataset.dayTheme='${PREVIEW_DAY_THEME}';`
  : `(function(){try{var d=new Date(),m=d.getMonth(),dt=d.getDate(),day=d.getDay(),t='default';if(m===10&&dt===25){t='yellow';}else if(day===2){t='green';}else if(day===5){t='yellow';}document.documentElement.dataset.dayTheme=t;}catch(e){}})();`;
