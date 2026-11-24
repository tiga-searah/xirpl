import { AdminNailong } from '../components/day-theme-sync';
import XiRplMascot from '@xirpl/shared/components/mascot';
import { SITE_NAME } from '@xirpl/shared/constants';
import {
  CalendarDays,
  ChevronRight,
  ScrollText,
  Users,
  Wrench,
} from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: `Admin | ${SITE_NAME}`,
  description: `Panel admin ${SITE_NAME}`,
};

const SECTIONS = [
  {
    href: '/habit',
    title: 'Dashboard Kebiasaan',
    desc: 'Rekap kebiasaan seluruh anggota kelas.',
    icon: ScrollText,
    ready: true,
    accent: 'bg-pastel-blue',
  },
  {
    href: '/schedules',
    title: 'Jadwal Pelajaran',
    desc: 'Kelola jadwal pelajaran kelas.',
    icon: CalendarDays,
    ready: false,
    accent: 'bg-pastel-green',
  },
  {
    href: '/picket',
    title: 'Picket',
    desc: 'Kelola jadwal piket.',
    icon: Users,
    ready: false,
    accent: 'bg-pastel-yellow',
  },
] as const;

export default function AdminHome() {
  return (
    <main className="mx-auto w-full max-w-360 px-4 pb-16 sm:px-6">
      <section className="flex flex-col items-center gap-3 py-12 text-center">
        <div className="flex items-end justify-center gap-3">
          <XiRplMascot pose="cheer" size={140} className="h-auto w-32 sm:w-36" />
          <AdminNailong
            src="/images/nailong-10.webp"
            className="h-auto w-24 sm:w-28 drop-shadow-[0_6px_12px_rgba(10,37,64,0.2)]"
          />
        </div>
        <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
          {SITE_NAME}
        </h1>
        <p className="max-w-md text-muted-foreground">
          Admin Panel
        </p>
      </section>

      <ul className="mx-auto w-full max-w-xl overflow-hidden rounded-3xl border-2 border-border bg-card">
        {SECTIONS.map(({ href, title, desc, icon: Icon, ready, accent }) => (
          <li
            key={href}
            className="border-border border-b last:border-0"
          >
            {ready ? (
              <Link
                href={href}
                className="hover:bg-accent flex items-center gap-4 px-5 py-4"
              >
                <span
                  className={`flex size-10 shrink-0 items-center justify-center rounded-xl border-2 border-border ${accent}`}
                >
                  <Icon className="size-5 text-brand-navy" />
                </span>
                <span className="min-w-0">
                  <span className="font-display block font-bold">{title}</span>
                  <span className="text-muted-foreground block text-sm">
                    {desc}
                  </span>
                </span>
                <ChevronRight className="text-muted-foreground ml-auto size-5 shrink-0" />
              </Link>
            ) : (
              <div className="flex items-center gap-4 px-5 py-4 opacity-60">
                <span
                  className={`flex size-10 shrink-0 items-center justify-center rounded-xl border-2 border-border ${accent}`}
                >
                  <Icon className="size-5 text-brand-navy" />
                </span>
                <span className="min-w-0">
                  <span className="font-display block font-bold">{title}</span>
                  <span className="text-muted-foreground block text-sm">
                    {desc}
                  </span>
                </span>
                <span className="ml-auto shrink-0 rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground">
                  Segera
                </span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
