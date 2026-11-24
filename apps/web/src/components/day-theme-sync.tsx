'use client';

import { getDayTheme } from '@fe/lib/day-theme';
import { useEffect } from 'react';

export function DayThemeSync() {
  useEffect(() => {
    const apply = () => {
      document.documentElement.dataset.dayTheme = getDayTheme();
    };
    apply();
    const timer = setInterval(apply, 60_000);
    return () => clearInterval(timer);
  }, []);

  return null;
}
