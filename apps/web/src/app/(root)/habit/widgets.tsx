'use client';

import { cn } from '@fe/lib/utils';
// ponytail: same chart the admin dashboard already ships, so the student view
// and the teacher view can never drift apart.
import { TrendArea } from '@xirpl/shared/components/habit-admin/charts';
import { InfoHint } from '@xirpl/shared/components/info-hint';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@xirpl/shared/components/ui/card';
import { ChevronLeftIcon, ChevronRightIcon, FlameIcon } from 'lucide-react';
import { AnimatePresence, motion as m, useReducedMotion } from 'motion/react';
import { useMemo, useState } from 'react';
import {
  attendanceCopy,
  averageScore,
  dailySeries,
  EMPTY_MODULE_AVERAGES,
  HEAT_BG,
  HEAT_TEXT,
  type JournalRecap,
  MODULES,
  MONTHS,
  moduleStats,
  type StreakData,
  sameDay,
  toLocalDate,
  totalScore,
  WEEKDAYS,
} from '../../../../data/habit-data';

export { InfoHint };

export function HabitCalendar({
  selected,
  month,
  levels,
  onSelect,
  onMonthChange,
}: {
  selected: Date;
  month: Date;
  levels: Map<number, number>;
  onSelect: (d: Date) => void;
  onMonthChange: (d: Date) => void;
}) {
  const reduce = useReducedMotion();
  const [dir, setDir] = useState(1);
  const today = useMemo(() => new Date(), []);

  const year = month.getFullYear();
  const mo = month.getMonth();
  const total = new Date(year, mo + 1, 0).getDate();
  const lead = (new Date(year, mo, 1).getDay() + 6) % 7;

  const step = (delta: number) => {
    setDir(delta);
    onMonthChange(new Date(year, mo + delta, 1));
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <m.div
            key={`${year}-${mo}`}
            initial={reduce ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <CardTitle className="text-lg font-bold tracking-tight text-foreground dark:text-foreground">
              {MONTHS[mo]}{' '}
              <span className="font-normal text-muted-foreground">{year}</span>
            </CardTitle>
          </m.div>
          <InfoHint
            label="Kalender"
            text="Tiap kotak adalah satu hari, makin hijau berarti makin tinggi perolehan poin dari total 100 poin. Klik satu tanggal untuk melihat catatannya. Tanggal selain hari ini hanya bisa dibaca."
          />
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            aria-label="Bulan sebelumnya"
            onClick={() => step(-1)}
            className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground dark:hover:bg-secondary dark:hover:text-foreground"
          >
            <ChevronLeftIcon className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Bulan berikutnya"
            onClick={() => step(1)}
            className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground dark:hover:bg-secondary dark:hover:text-foreground"
          >
            <ChevronRightIcon className="size-4" />
          </button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="mb-2 grid grid-cols-7 gap-2.5">
          {WEEKDAYS.map((d) => (
            <abbr
              key={d}
              title={d}
              className="text-center text-xs font-medium text-muted-foreground no-underline"
            >
              {d[0]}
            </abbr>
          ))}
        </div>

        <div className="-m-1 overflow-hidden p-1">
          <AnimatePresence mode="wait" initial={false}>
            <m.div
              key={`${year}-${mo}`}
              initial={reduce ? false : { opacity: 0, x: dir * 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, x: dir * -24 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="grid grid-cols-7 gap-2.5"
            >
              {Array.from({ length: lead }, (_, i) => (
                <span key={`lead-${i}`} />
              ))}
              {Array.from({ length: total }, (_, i) => {
                const day = i + 1;
                const cell = new Date(year, mo, day);
                const future = cell > today && !sameDay(cell, today);
                const lvl = levels.get(day) ?? 0;

                return (
                  <button
                    key={day}
                    type="button"
                    disabled={future}
                    aria-label={`${day} ${MONTHS[mo]}, ${lvl} dari 4 modul selesai`}
                    aria-current={sameDay(cell, today) ? 'date' : undefined}
                    onClick={() => onSelect(cell)}
                    className={cn(
                      'flex aspect-square items-center justify-center rounded-lg text-sm font-medium transition-all',
                      future
                        ? 'cursor-not-allowed text-muted-foreground/40'
                        : cn('cursor-pointer', HEAT_BG[lvl], HEAT_TEXT[lvl]),
                      sameDay(cell, today) &&
                        'ring-2 ring-orange-400 ring-offset-2 ring-offset-background',
                      sameDay(cell, selected) &&
                        !sameDay(cell, today) &&
                        'ring-2 ring-ring ring-offset-2 ring-offset-background dark:ring-ring',
                    )}
                  >
                    {day}
                  </button>
                );
              })}
            </m.div>
          </AnimatePresence>
        </div>

        <div className="mt-4 flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
          <span>Sedikit</span>
          {HEAT_BG.map((c, i) => (
            <span
              key={c}
              title={`${i} modul selesai`}
              className={cn('size-3 rounded-sm', c)}
            />
          ))}
          <span>Banyak</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function HabitStats({
  month,
  recap,
  streak,
  onMonthChange,
}: {
  month: Date;
  recap: JournalRecap | null;
  streak: StreakData | null;
  onMonthChange: (d: Date) => void;
}) {
  const scores = useMemo(() => recap?.scores ?? [], [recap]);
  const series = useMemo(() => dailySeries(scores), [scores]);
  const stats = moduleStats(recap?.average_score_each ?? EMPTY_MODULE_AVERAGES);
  const perfect = scores.filter((s) => s.score === 100).length;
  const copy = useMemo(() => attendanceCopy(new Date()), []);

  const average = recap?.average_score ?? averageScore(scores);
  const total = recap?.total_score ?? totalScore(scores);
  const count = streak?.streak ?? 0;
  // The server sends the last check-in date, so today is safe when it matches.
  const since = streak?.since ? toLocalDate(streak.since) : null;
  const todayDone = !!since && sameDay(since, new Date());
  const atRisk = !todayDone && count > 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <CardTitle className="text-lg font-bold tracking-tight text-foreground dark:text-foreground">
          Statistik
        </CardTitle>
        <select
          aria-label="Filter bulan"
          value={month.getMonth()}
          onChange={(e) =>
            onMonthChange(
              new Date(month.getFullYear(), Number(e.target.value), 1),
            )
          }
          className="cursor-pointer rounded-lg border border-border bg-card px-2 py-1 text-sm font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50 dark:border-border dark:bg-secondary dark:text-foreground"
        >
          {MONTHS.map((n, i) => (
            <option key={n} value={i}>
              {n}
            </option>
          ))}
        </select>
      </CardHeader>

      <CardContent>
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border/70 bg-card p-3 dark:border-border">
            <span className="text-2xl font-bold tabular-nums text-foreground dark:text-foreground">
              {total}{' '}
              <span className="text-sm font-semibold text-muted-foreground">
                poin
              </span>
            </span>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              Total poin bulan ini
              <InfoHint
                label="Total poin bulan ini"
                text="Total akumulasi seluruh poin yang kamu kumpulkan di bulan ini. Maksimal 100 poin per hari."
              />
            </p>
          </div>
          <div className="rounded-xl border border-border/70 bg-card p-3 dark:border-border">
            <span className="text-2xl font-bold tabular-nums text-foreground dark:text-foreground">
              {average}%
            </span>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              Rata-rata harian
              <InfoHint
                label="Rata-rata harian"
                text="Rata-rata ketuntasan per hari di bulan ini. Hari sempurna bernilai 100% (100 poin)."
              />
            </p>
          </div>
        </div>

        <TrendArea series={series} height={150} name="Poin harian" />

        <div className="mt-7 border-t border-border/70 pt-5 dark:border-border">
          <div
            className={cn(
              'relative flex items-center justify-between gap-3 rounded-xl p-3',
              count > 0
                ? 'bg-linear-to-r from-orange-50 to-amber-50 dark:from-orange-950/40 dark:to-amber-950/30'
                : 'bg-secondary dark:bg-secondary/40',
            )}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div
                className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-xl',
                  count > 0
                    ? 'bg-orange-500 text-white'
                    : 'bg-secondary text-muted-foreground dark:bg-secondary',
                )}
              >
                <FlameIcon className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-2xl leading-none font-bold tabular-nums text-foreground dark:text-foreground">
                  {count}{' '}
                  <span className="text-sm font-medium text-muted-foreground">
                    hari beruntun
                  </span>
                  <InfoHint
                    label="Hari beruntun"
                    text={`Jumlah hari berturut-turut kamu ${copy.verb.toLowerCase()}. Dihitung dari seluruh riwayat di server, bukan per bulan, jadi tidak ikut berubah saat kamu ganti bulan. Satu hari terlewat memutus hitungan.`}
                  />
                </p>
                <p className="mt-1 text-xs leading-snug text-muted-foreground">
                  {todayDone
                    ? 'Aman untuk hari ini'
                    : atRisk
                      ? `${copy.verb} sebelum ${copy.deadline} agar streak tidak putus`
                      : `${copy.verb} sebelum ${copy.deadline} untuk memulai streak`}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 mb-3 flex items-baseline justify-between gap-2">
            <span className="flex items-center gap-2 text-sm font-semibold text-foreground dark:text-foreground">
              Konsistensi
              <InfoHint
                label="Konsistensi"
                text="Porsi hari di bulan ini yang keempat modulnya selesai semua. Hari yang cuma sebagian terisi tidak dihitung di sini."
              />
            </span>
            <span className="text-sm text-muted-foreground">
              {perfect} dari {scores.length} hari penuh
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary dark:bg-secondary">
              <m.div
                initial={{ width: 0 }}
                animate={{ width: `${recap?.rate ?? 0}%` }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
                className="h-full rounded-full bg-linear-to-r from-emerald-400 to-emerald-600"
              />
            </div>
            <span className="text-sm font-bold tabular-nums text-foreground dark:text-foreground">
              {recap?.rate ?? 0}%
            </span>
          </div>
        </div>

        <div className="mt-6 border-t border-border/70 pt-5 dark:border-border">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground dark:text-foreground">
              Per modul
            </span>
            <InfoHint
              label="Per modul"
              text="Total perolehan poin tiap modul di bulan ini dibanding target maksimal. Kehadiran (30 poin/hari), Ibadah (20 poin/hari), Olahraga (25 poin/hari), dan Belajar (25 poin/hari)."
            />
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
            {MODULES.map((mod) => {
              const days = Math.max(1, recap?.elapsed_days ?? scores.length);
              const max = mod.max || 25;
              const target = days * max;
              const collected =
                recap?.total_score_each?.[mod.api] !== undefined
                  ? recap.total_score_each[mod.api]
                  : Math.round((stats[mod.key] ?? 0) * days);
              const pct =
                target > 0 ? Math.round((collected / target) * 100) : 0;
              return (
                <div key={mod.key} className="flex items-center gap-2">
                  <span
                    className={cn('size-2 shrink-0 rounded-full', mod.dot)}
                  />
                  <span className="text-sm text-muted-foreground dark:text-muted-foreground">
                    {mod.label}
                  </span>
                  <span className="ml-auto text-sm font-semibold tabular-nums text-foreground dark:text-foreground">
                    {collected}/{target} poin{' '}
                    <span className="text-xs font-normal text-muted-foreground">
                      ({pct}%)
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
