'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { getDayTheme } from '../lib/day-theme';

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

export function AdminNailong({
  src,
  className,
}: {
  src: string;
  className?: string;
}) {
  const [isYellow, setIsYellow] = useState(false);

  useEffect(() => {
    setIsYellow(getDayTheme() === 'yellow');
  }, []);

  if (!isYellow) return null;

  return (
    <Image
      src={src}
      alt="Nailong"
      width={120}
      height={120}
      unoptimized
      className={className}
    />
  );
}
