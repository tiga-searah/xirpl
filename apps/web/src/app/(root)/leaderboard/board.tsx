'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@fe/components/ui/avatar';
import { useStudents } from '@fe/hooks/use-students';
import { useUser } from '@fe/hooks/use-user';
import api, { fileUrl } from '@fe/lib/api';
import { getDayTheme } from '@fe/lib/day-theme';
import { cn } from '@fe/lib/utils';
import XiRplMascot from '@xirpl/shared/components/mascot';
import { Button } from '@xirpl/shared/components/ui/button';
import { Skeleton } from '@xirpl/shared/components/ui/skeleton';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CrownIcon,
  FlameIcon,
  RotateCcwIcon,
  TrophyIcon,
} from 'lucide-react';
import { AnimatePresence, motion as m, useReducedMotion } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fmtMonth,
  type LeaderboardEntry,
  MONTHS,
} from '../../../../data/habit-data';

/** Podium colors: gold, silver, bronze for the top three ranks. */
const MEDALS = [
  {
    tile: 'border-brand-yellow bg-pastel-yellow [--duo-shade:#e0a800]',
    badge: 'bg-brand-yellow text-brand-navy',
    avatar: 'size-18 text-lg',
    minH: 'sm:min-h-64',
    points: 'text-3xl',
  },
  {
    tile: 'border-slate-300 bg-slate-100 [--duo-shade:#a8b6c5]',
    badge: 'bg-slate-300 text-brand-navy',
    avatar: 'size-16 text-base',
    minH: 'sm:min-h-54',
    points: 'text-2xl',
  },
  {
    tile: 'border-[#eab68a] bg-[#ffe3cf] [--duo-shade:#cd8b52]',
    badge: 'bg-[#e0995f] text-brand-navy',
    avatar: 'size-14 text-base',
    minH: 'sm:min-h-48',
    points: 'text-2xl',
  },
];

// Podium column positions on desktop: silver left, gold center, bronze right.
const PODIUM_PLACE = [
  'sm:col-start-2 sm:row-start-1',
  'sm:col-start-1 sm:row-start-1',
  'sm:col-start-3 sm:row-start-1',
];

// Name initial for avatar circles without a photo.
const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean)[0]?.charAt(0).toUpperCase() ?? '';

function BoardAvatar({
  name,
  avatarUrl,
  className,
}: {
  name: string;
  /** Student profile URL/photo from `GET /users/students`. */
  avatarUrl?: string | null;
  className?: string;
}) {
  return (
    <Avatar
      className={cn(
        'after:border-brand-navy/20 dark:after:border-border',
        className,
      )}
    >
      {avatarUrl ? (
        <AvatarImage
          src={fileUrl(avatarUrl)}
          alt={`Avatar ${name}`}
          loading="lazy"
        />
      ) : null}
      <AvatarFallback
        // Radix swaps in the fallback once the image fails/misses.
        delayMs={avatarUrl ? 600 : undefined}
        className={cn(
          'bg-white font-black text-brand-blue dark:bg-secondary',
          className,
        )}
      >
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}

function StreakPill({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center gap-0.5 text-xs font-bold text-muted-foreground',
        className,
      )}
    >
      <FlameIcon className="size-3.5 text-amber-500" aria-hidden />
      {value}
      <span className="sr-only">hari streak</span>
    </span>
  );
}

function PodiumCard({
  entry,
  place,
  selfId,
  avatarUrl,
  reduce,
}: {
  entry: LeaderboardEntry;
  place: number;
  selfId?: string;
  avatarUrl?: string | null;
  reduce: boolean | null;
}) {
  const medal = MEDALS[place];
  const me = entry.user_id === selfId;

  return (
    <m.div
      initial={reduce ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: 0.08 * place,
        duration: 0.45,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={cn(
        'duo-card relative flex min-h-44 flex-col items-center gap-1.5 rounded-3xl border-2 p-4 text-center',
        medal.tile,
        PODIUM_PLACE[place],
        medal.minH,
        me && 'ring-2 ring-brand-blue ring-offset-2 ring-offset-background',
      )}
    >
      {place === 0 && (
        <>
          <m.div
            animate={
              reduce ? undefined : { y: [0, -5, 0], rotate: [-10, -5, -10] }
            }
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -top-5 left-1/2 -translate-x-1/2"
          >
            <CrownIcon
              className="size-9 fill-amber-400 text-amber-600 drop-shadow-md"
              aria-hidden
            />
          </m.div>
          <XiRplMascot
            pose="cheer"
            tool="trophy"
            toolRight="medal"
            size={110}
            className="pointer-events-none absolute -top-14 right-0 z-10 rotate-10 sm:-right-4"
          />
        </>
      )}

      <span
        className={cn(
          'mt-1 grid size-8 place-items-center rounded-full border-2 border-white/70 text-sm font-black shadow-sm',
          medal.badge,
        )}
      >
        {entry.rank}
      </span>

      <Link
        href={`/users/${entry.user_id}`}
        aria-label={`Lihat profil ${entry.name}`}
        className="flex max-w-full flex-col items-center gap-1.5 rounded-2xl text-brand-navy focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-navy"
      >
        <BoardAvatar
          name={entry.name}
          avatarUrl={avatarUrl}
          className={medal.avatar}
        />
        <span
          className="max-w-full truncate text-sm font-extrabold"
          title={entry.name}
        >
          {entry.name}
        </span>
      </Link>

      <p className="flex items-baseline justify-center gap-1">
        <span
          className={cn(
            'font-black tabular-nums text-brand-navy',
            medal.points,
          )}
        >
          {entry.points}
        </span>
        <span className="text-xs font-bold text-brand-navy">poin</span>
      </p>

      <StreakPill value={entry.streak} className="text-brand-navy" />

      {me && (
        <span className="absolute top-2 right-2 rounded-full bg-brand-blue px-2 py-0.5 text-[10px] font-black tracking-wide text-white uppercase">
          Kamu
        </span>
      )}
    </m.div>
  );
}

function BoardSkeleton() {
  return (
    <div aria-hidden>
      <div className="grid gap-4 sm:grid-cols-3 sm:items-end">
        <Skeleton className="order-1 h-64 rounded-3xl sm:order-0" />
        <Skeleton className="order-2 h-54 rounded-3xl sm:order-0" />
        <Skeleton className="order-3 h-48 rounded-3xl sm:order-0" />
      </div>
      <Skeleton className="mt-8 h-24 rounded-3xl" />
      <div className="mt-4 space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export default function LeaderboardBoard() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const { user, loading: userLoading } = useUser();
  // Student profile photos come from GET /users/students.
  const [students] = useStudents();
  const avatars = useMemo(
    () => new Map(students.map((s) => [s.id, s.avatar_url ?? null])),
    [students],
  );

  const now = useMemo(() => new Date(), []);
  const [month, setMonth] = useState(() => new Date());
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [failed, setFailed] = useState(false);

  // Private page: send anonymous visitors to login, like the journal.
  useEffect(() => {
    if (userLoading || user) return;
    router.replace('/login?r=%2Fleaderboard');
  }, [router, user, userLoading]);

  // Reload the board when the month changes; also re-invoked by the retry button.
  const load = useCallback(() => {
    setEntries(null);
    setFailed(false);
    let alive = true;
    api.leaderboard
      .get({ query: { month: fmtMonth(month) } })
      .then(({ data }) => {
        if (alive) setEntries(data?.data.entries ?? []);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [month]);

  useEffect(() => {
    if (userLoading || !user) return;
    return load();
  }, [load, user, userLoading]);

  const step = (delta: number) =>
    setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1));

  const atCurrent =
    month.getFullYear() === now.getFullYear() &&
    month.getMonth() === now.getMonth();

  const top = entries?.slice(0, 3) ?? [];
  const self = entries?.find((e) => e.user_id === user?.id);
  // `failed` renders the retry card, so an empty list is safe here.
  const list = entries ?? [];
  const remaining = list.filter((entry) => entry.rank > 3);

  if (userLoading || !user || (entries === null && !failed)) {
    return (
      <div className="mx-auto max-w-360 px-4 py-8 pb-16 sm:px-6">
        <Skeleton className="h-44 rounded-[2rem]" />
        <div className="mx-auto mt-8 max-w-3xl">
          <BoardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-360 px-4 py-8 pb-16 sm:px-6">
      {/* Colored greeting with a yellow pill, like the main banner */}
      <m.header
        initial={reduce ? false : { opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative mb-8 overflow-hidden rounded-[2rem] border-2 border-brand-blue/25 bg-pastel-blue/50 p-6 sm:p-8 dark:bg-pastel-blue/40"
      >
        {/* biome-ignore lint/a11y/noSvgWithoutTitle: purely decorative circle, hidden from screen readers */}
        <svg
          className="pointer-events-none absolute -top-24 -right-24 size-72 text-white/60 dark:text-white/10"
          viewBox="0 0 600 600"
          fill="none"
          aria-hidden
        >
          <circle
            cx="300"
            cy="300"
            r="270"
            stroke="currentColor"
            strokeWidth="36"
          />
          <circle
            cx="300"
            cy="300"
            r="170"
            stroke="currentColor"
            strokeWidth="36"
          />
        </svg>

        <div className="relative flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          {getDayTheme() === 'yellow' && (
            <Image
              src="/images/nailong-7.webp"
              alt="Nailong"
              width={104}
              height={104}
              loading="eager"
              unoptimized
              className="pointer-events-none absolute -top-2 right-0 hidden h-auto w-24 sm:block drop-shadow-[0_6px_12px_rgba(10,37,64,0.2)]"
            />
          )}
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border-2 border-brand-navy bg-brand-yellow px-3.5 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-brand-navy shadow-[0_3px_0_0_#0a2540]">
              <span className="font-mono" aria-hidden>
                &gt;_
              </span>
              Leaderboard
            </span>
            <h1 className="font-display mt-3 text-4xl font-black tracking-tight text-brand-navy sm:text-5xl dark:text-white">
              Papan Peringkat
            </h1>
            <p className="text-muted-foreground mt-2 max-w-xl text-sm leading-relaxed font-medium sm:text-base">
              Peringkat teman sekelas dari poin bulan terpilih: tiap modul yang
              selesai bernilai 25 poin per hari, jadi hari sempurna bernilai 100
              poin.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="outline"
              aria-label="Bulan sebelumnya"
              className="size-11 rounded-2xl"
              pointer
              onClick={() => step(-1)}
            >
              <ChevronLeftIcon />
            </Button>
            <AnimatePresence mode="wait" initial={false}>
              <m.span
                key={fmtMonth(month)}
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                aria-live="polite"
                className="rounded-full border-2 border-border bg-card px-4 py-2 text-sm font-extrabold whitespace-nowrap text-foreground"
              >
                {MONTHS[month.getMonth()]} {month.getFullYear()}
              </m.span>
            </AnimatePresence>
            <Button
              size="icon"
              variant="outline"
              aria-label="Bulan berikutnya"
              disabled={atCurrent}
              className="size-11 rounded-2xl"
              pointer
              onClick={() => step(1)}
            >
              <ChevronRightIcon />
            </Button>
          </div>
        </div>
      </m.header>

      <div className="mx-auto max-w-3xl">
        {failed ? (
          <div className="flex flex-col items-center gap-3 rounded-[2rem] border-2 border-dashed border-border px-6 py-14 text-center">
            <TrophyIcon
              className="size-9 text-muted-foreground/50"
              aria-hidden
            />
            <p className="text-lg font-extrabold text-foreground">
              Gagal memuat papan peringkat
            </p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Periksa koneksi kamu lalu coba lagi.
            </p>
            <Button
              variant="special"
              className="mt-1"
              pointer
              onClick={() => load()}
            >
              <RotateCcwIcon /> Coba Lagi
            </Button>
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-[2rem] border-2 border-dashed border-border px-6 py-12 text-center">
            <XiRplMascot
              size={220}
              className="h-auto w-full max-w-50 opacity-95"
            />
            <p className="mt-2 text-lg font-extrabold text-foreground">
              Belum ada peringkat bulan ini
            </p>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              Isi jurnal dan absen hari ini untuk mengumpulkan poin pertamamu.
            </p>
            <Button asChild variant="special" className="mt-1" pointer>
              <Link href="/habit">Buka Jurnal Kebiasaan</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3 sm:items-end">
              {top.map((entry, i) => (
                <PodiumCard
                  key={entry.user_id}
                  entry={entry}
                  place={i}
                  selfId={user.id}
                  avatarUrl={avatars.get(entry.user_id) ?? entry.avatar_url}
                  reduce={reduce}
                />
              ))}
            </div>

            {self && self.rank > 3 && (
              <a
                href="#peringkatmu"
                aria-label={`Lihat peringkatmu, peringkat ${self.rank}`}
                className="mt-6 block rounded-2xl focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <m.div
                  initial={reduce ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="duo-card flex items-center gap-3 rounded-2xl border-2 border-brand-blue/40 bg-pastel-blue/70 px-4 py-3 [--duo-shade:color-mix(in_srgb,var(--brand-primary)_35%,transparent)]"
                >
                  <span className="rounded-full bg-brand-blue px-2 py-0.5 text-[10px] font-black tracking-wide text-[var(--brand-primary-fg)] uppercase">
                    Kamu
                  </span>
                  <span className="text-sm font-extrabold tabular-nums text-foreground">
                    #{self.rank}
                  </span>
                  <StreakPill value={self.streak} className="ml-auto" />
                  <span className="text-sm font-bold tabular-nums text-foreground">
                    {self.points}{' '}
                    <span className="text-xs font-semibold text-muted-foreground">
                      poin
                    </span>
                  </span>
                </m.div>
              </a>
            )}

            {remaining.length > 0 && (
              <section className="mt-8">
                <div className="duo-card overflow-hidden rounded-3xl border-2 border-border/70 bg-card">
                  <ul className="divide-y divide-border/70 dark:divide-border">
                    {remaining.map((entry) => {
                      const me = entry.user_id === user.id;
                      return (
                        <li
                          key={entry.user_id}
                          id={me ? 'peringkatmu' : undefined}
                          className={me ? 'scroll-mt-20' : undefined}
                        >
                          <div
                            className={cn(
                              'flex items-center gap-3 px-4 py-3 transition-colors sm:px-5',
                              me
                                ? 'bg-pastel-blue/70 dark:bg-blue-500/15'
                                : 'hover:bg-secondary/50 dark:hover:bg-secondary/50',
                            )}
                          >
                            <span className="w-8 shrink-0 text-center text-sm font-black tabular-nums text-muted-foreground">
                              {entry.rank}
                            </span>

                            <Link
                              href={`/users/${entry.user_id}`}
                              aria-label={`Lihat profil ${entry.name}`}
                              className="flex min-h-11 min-w-0 items-center gap-3 rounded-xl text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                            >
                              <BoardAvatar
                                name={entry.name}
                                avatarUrl={
                                  avatars.get(entry.user_id) ?? entry.avatar_url
                                }
                                className="size-10 text-xs"
                              />
                              <span
                                className="min-w-0 truncate text-sm font-bold"
                                title={entry.name}
                              >
                                {entry.name}
                              </span>
                            </Link>
                            {me && (
                              <span className="shrink-0 rounded-full bg-brand-blue px-1.5 py-0.5 text-[10px] font-black tracking-wide text-[var(--brand-primary-fg)] uppercase">
                                Kamu
                              </span>
                            )}

                            <span className="ml-auto flex shrink-0 items-center gap-3">
                              <span className="hidden min-[420px]:block">
                                <StreakPill value={entry.streak} />
                              </span>
                              <span className="min-w-14 text-right text-sm font-extrabold tabular-nums text-foreground">
                                {entry.points}
                                <span className="sr-only"> poin</span>
                              </span>
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
