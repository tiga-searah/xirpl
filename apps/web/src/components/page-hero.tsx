'use client';

import { getDayTheme } from '@fe/lib/day-theme';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';

const NAILONG_BY_PATH: Record<string, string> = {
  '/albums': '/images/nailong-3.webp',
  '/schedules/subject': '/images/nailong-4.webp',
  '/schedules/picket': '/images/nailong-5.webp',
  '/bazzar-orders': '/images/nailong-6.webp',
};

// Same look as the leaderboard banner: pastel card, yellow ">_" pill, title, desc.
export default function PageHero(props: {
  pill: string;
  title: string;
  desc: string;
  children?: ReactNode;
}) {
  const pathname = usePathname();
  const [isYellow, setIsYellow] = useState(false);

  useEffect(() => {
    setIsYellow(getDayTheme() === 'yellow');
  }, []);

  const nailongSrc =
    NAILONG_BY_PATH[pathname] ?? '/images/nailong-8.webp';

  return (
    <header className="border-brand-blue/25 bg-pastel-blue/50 relative mb-8 overflow-hidden rounded-[2rem] border-2 p-6 sm:p-8 dark:bg-pastel-blue/40">
      {/* biome-ignore lint/a11y/noSvgWithoutTitle: purely decorative circle, hidden from screen readers */}
      <svg
        className="pointer-events-none absolute -top-24 -right-24 size-72 text-white/60 dark:text-white/10"
        viewBox="0 0 600 600"
        fill="none"
        aria-hidden
      >
        <circle cx="300" cy="300" r="270" stroke="currentColor" strokeWidth="36" />
        <circle cx="300" cy="300" r="170" stroke="currentColor" strokeWidth="36" />
      </svg>

      {isYellow && !props.children && (
        <div className="pointer-events-none absolute right-4 bottom-0 hidden w-24 sm:block sm:w-28">
          <Image
            src={nailongSrc}
            alt="Nailong"
            width={112}
            height={112}
            unoptimized
            className="h-auto w-full drop-shadow-[0_6px_12px_rgba(10,37,64,0.2)]"
          />
        </div>
      )}

      <div className="relative flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        <div className="min-w-0 flex-1">
          <span className="border-brand-navy bg-brand-yellow text-brand-navy inline-flex items-center gap-2 rounded-full border-2 px-3.5 py-1 text-[11px] font-black tracking-[0.14em] uppercase shadow-[0_3px_0_0_#0a2540]">
            <span className="font-mono" aria-hidden>
              &gt;_
            </span>
            {props.pill}
          </span>
          <h1 className="font-display text-brand-navy mt-3 text-3xl font-black tracking-tight sm:text-5xl dark:text-white">
            {props.title}
          </h1>
          <p className="text-muted-foreground mt-2 max-w-xl text-sm leading-relaxed font-medium sm:text-base">
            {props.desc}
          </p>
        </div>
        {props.children && (
          <div className="flex w-full shrink-0 items-end justify-center gap-3 sm:w-auto sm:justify-end">
            {isYellow && (
              <Image
                src={nailongSrc}
                alt="Nailong"
                width={96}
                height={96}
                unoptimized
                className="pointer-events-none hidden h-auto w-20 shrink-0 sm:block sm:w-24 drop-shadow-[0_6px_12px_rgba(10,37,64,0.2)]"
              />
            )}
            {props.children}
          </div>
        )}
      </div>
    </header>
  );
}
