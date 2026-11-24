'use client';

import { CheckIcon, ClockIcon, MapPinIcon } from 'lucide-react';
import { motion as m } from 'motion/react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import XiRplMascot from '@xirpl/shared/components/mascot';
import SectionHeader from '@fe/components/section-header';
import { Skeleton } from '@xirpl/shared/components/ui/skeleton';
import { cn } from '@fe/lib/utils';
import { scheduleData } from '../../../data/subject-schedule';

const mins = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

const fmtDay = (d: Date) =>
  d.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

export default function TodaySchedule() {
  // The date is computed client-side only, so the server render never differs from the client.
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const day = now?.getDay();
  const hour = now?.getHours();
  // 6PM+ show next day's schedule, except Fri/Sat (next day no school).
  // Sunday (getDay()=0) counts too: it previews Monday.
  let targetDay = day;
  let shownDate = now;
  if (now && hour !== undefined && hour >= 18 && day !== undefined && day <= 4) {
    targetDay = day + 1;
    shownDate = new Date(now);
    shownDate.setDate(shownDate.getDate() + 1);
  }
  const lessons =
    targetDay && targetDay >= 1 && targetDay <= 5
      ? scheduleData[targetDay - 1]
      : null;
  const clock = now?.toTimeString().slice(0, 5);
  // Evening preview shows tomorrow's lessons — today's clock must not
  // mark them "done".
  const isToday = targetDay === day;

  return (
    <section id="today-schedule" className="scroll-mt-20">
      <SectionHeader
        title={isToday ? 'Jadwal Hari Ini' : 'Jadwal Besok'}
        desc={now ? fmtDay(shownDate ?? now) : 'Memuat hari ini...'}
      />

      {!now ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 rounded-3xl" />
          ))}
        </div>
      ) : lessons?.lessons.length ? (
        <ol className="flex flex-col gap-3">
          {lessons.lessons.map((l, i) => {
            const active =
              isToday && !!clock && clock >= l.startTime && clock <= l.endTime;
            const done = isToday && !!clock && clock > l.endTime;
            // Progress of the running lesson, from the real time data.
            const pct =
              active && clock
                ? Math.min(
                    100,
                    Math.max(
                      0,
                      ((mins(clock) - mins(l.startTime)) /
                        (mins(l.endTime) - mins(l.startTime) || 1)) *
                        100,
                    ),
                  )
                : 0;
            return (
              <m.li
                key={l.time}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ delay: i * 0.05 }}
                className={cn(
                  'bg-card duo-card duo-press flex flex-col gap-3 rounded-2xl border-l-[10px] p-4 sm:p-5',
                  l.color,
                  active &&
                    'bg-pastel-blue/50 [--duo-depth:6px] dark:bg-blue-500/15',
                  done && 'opacity-55',
                )}
              >
                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 flex-1 items-start gap-3.5 sm:items-center">
                    <span className="text-brand-navy w-20 shrink-0 font-mono text-sm font-extrabold tabular-nums sm:w-24 sm:text-base dark:text-white">
                      {l.startTime}
                      <span className="text-muted-foreground block font-sans text-xs font-bold">
                        {l.endTime}
                      </span>
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="text-base font-extrabold leading-tight sm:leading-normal md:text-lg">
                        {l.subject}
                      </span>
                      <span className="text-muted-foreground text-xs font-medium leading-tight sm:leading-normal sm:text-sm">
                        {l.teacher}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2 sm:self-center">
                    {l.room && (
                      <span className="bg-secondary text-secondary-foreground border-border flex shrink-0 items-center gap-1 rounded-full border-2 px-3 py-1 text-xs font-extrabold uppercase">
                        <MapPinIcon className="size-3.5" /> {l.room}
                      </span>
                    )}
                    {active && (
                      <span className="bg-brand-blue duo-card flex shrink-0 items-center gap-1 rounded-full border-transparent px-3 py-1 text-xs font-extrabold tracking-wide uppercase text-[var(--brand-primary-fg)] [--duo-depth:3px] [--duo-shade:var(--brand-primary-shadow)]">
                        <ClockIcon className="size-3.5" /> Sekarang
                      </span>
                    )}
                    {done && (
                      <span
                        title="Sudah selesai"
                        className="bg-pastel-green flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-emerald-500 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                      >
                        <CheckIcon className="size-4" strokeWidth={3} />
                        <span className="sr-only">Sudah selesai</span>
                      </span>
                    )}
                  </div>
                </div>

                {active && (
                  <span className="bg-secondary border-border mt-0.5 h-2.5 w-full overflow-hidden rounded-full border-2 sm:h-3">
                    <span
                      className="bg-brand-yellow block h-full rounded-full transition-[width] duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </span>
                )}
              </m.li>
            );
          })}
        </ol>
      ) : (
        <div className="border-border bg-card duo-card flex flex-col items-center gap-2 rounded-3xl px-6 py-10 text-center">
          <XiRplMascot
            pose="sleep"
            size={180}
            className="h-auto w-full max-w-[180px]"
          />
          <p className="text-lg font-extrabold uppercase">
            Tidak ada jadwal hari ini.
          </p>
          <p className="text-muted-foreground text-sm font-medium">
            RPL tidur udah weekend, besok ngoding lagi.
          </p>
        </div>
      )}

      <Link
        href="/schedules/subject"
        className="text-[var(--brand-ink)] border-brand-blue/40 bg-card duo-card duo-press mt-5 inline-flex h-11 items-center rounded-2xl px-5 text-sm font-extrabold tracking-wide uppercase"
      >
        Lihat jadwal lengkap →
      </Link>
    </section>
  );
}
