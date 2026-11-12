'use client';

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  SearchIcon,
  TrendingUpIcon,
} from 'lucide-react';
import { motion as m, useReducedMotion } from 'motion/react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '../ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Input } from '../ui/input';
import type { ClassSummary, Member, MemberRow } from './types';

/** The dashboard can be mounted by the student web app or the standalone admin app. */
const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? '';

import { HabitScoreNotice } from '../habit-score-notice';
import { InfoHint } from '../info-hint';
import { DistributionBars, ModuleBars, ModuleRadar, TrendArea } from './charts';
import { useHabitAdmin } from './context';
import {
  MemberDetail,
  MemberTable,
  MemberTableSkeleton,
} from './dashboard-member';
import { DashboardSkeleton, Guard, Stat } from './dashboard-ui';

type SortKey = 'score' | 'name' | 'late' | 'absent';

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'score', label: 'Rata-rata tertinggi' },
  { key: 'name', label: 'Nama A–Z' },
  { key: 'late', label: 'Paling sering telat' },
  { key: 'absent', label: 'Paling sering absen' },
];

export default function AdminDashboard() {
  const {
    useUser,
    isAdminRole,
    downloadRecapPdf,
    fetchClassSummary,
    fetchMemberRows,
    fetchMembers,
    MONTHS,
  } = useHabitAdmin();
  const { user, loading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const reduce = useReducedMotion();

  const [members, setMembers] = useState<Member[] | null>(null);
  const [rows, setRows] = useState<MemberRow[]>([]);
  const [rowsLoading, setRowsLoading] = useState(true);
  const [klass, setKlass] = useState<ClassSummary | null>(null);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('score');
  const [exporting, setExporting] = useState(false);

  const exportPdf = () => {
    setExporting(true);
    downloadRecapPdf(month)
      .catch(() => alert('Gagal mengunduh PDF. Coba lagi.'))
      .finally(() => setExporting(false));
  };

  const allowed = isAdminRole(user?.role);
  const selectedId = params.get('member');

  useEffect(() => {
    if (!allowed) return;
    let alive = true;
    fetchMembers()
      .then((list) => alive && setMembers(list))
      .catch(() => alive && setMembers([]));
    return () => {
      alive = false;
    };
  }, [allowed]);

  useEffect(() => {
    if (!allowed) return;
    let alive = true;
    fetchClassSummary(month)
      .then((s) => alive && setKlass(s))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [allowed, month]);

  useEffect(() => {
    if (!members) return;
    if (!members.length) {
      setRowsLoading(false);
      return;
    }
    let alive = true;
    setRowsLoading(true);
    fetchMemberRows(members, month)
      .then((list) => alive && setRows(list))
      .catch(() => {})
      .finally(() => {
        if (alive) setRowsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [members, month]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? rows.filter(
          (r) =>
            r.member.name.toLowerCase().includes(q) ||
            String(r.member.nis).includes(q),
        )
      : [...rows];
    return list.sort((a, b) => {
      switch (sort) {
        case 'name':
          return a.member.name.localeCompare(b.member.name);
        case 'late':
          return b.late - a.late;
        case 'absent':
          return b.absent - a.absent;
        default:
          return b.score - a.score;
      }
    });
  }, [rows, query, sort]);

  const selected = useMemo(
    () => members?.find((mb) => String(mb.nis) === selectedId) ?? null,
    [members, selectedId],
  );

  const setMember = (nis: number) =>
    router.push(`${pathname}?member=${encodeURIComponent(String(nis))}`, {
      scroll: false,
    });

  const stepMonth = (delta: number) =>
    setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1));

  if (loading) return <DashboardSkeleton />;

  if (!allowed)
    return (
      <Guard
        title="Halaman khusus pengajar"
        body={
          user
            ? 'Akun kamu tidak punya akses ke dasbor ini. Hanya developer, guru, dan wali kelas yang bisa membukanya.'
            : 'Masuk dengan akun pengajar untuk melihat rekap kebiasaan seluruh anggota.'
        }
        action={
          user ? (
            <Button asChild variant="special" pointer>
              <Link href={`${WEB_URL}/habit`}>Ke jurnal saya</Link>
            </Button>
          ) : (
            <Button asChild variant="special" pointer>
              <Link
                href={`${WEB_URL}/login?r=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '/habit/admin')}`}
              >
                Masuk
              </Link>
            </Button>
          )
        }
      />
    );

  return (
    <div className="bg-background min-h-screen transition-colors duration-300">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <m.header
          initial={reduce ? false : { opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8 space-y-4"
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl dark:text-white">
                Dasbor Kebiasaan
              </h1>
              <p className="mt-1.5 text-base text-muted-foreground">
                {members?.length ?? 0} anggota ·{' '}
                {month.toLocaleDateString('id-ID', {
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {!selected && (
                <Button
                  variant="outline"
                  pointer
                  className="relative h-10"
                  onClick={exportPdf}
                  disabled={exporting}
                >
                  <DownloadIcon className="size-4" />
                  {exporting ? 'Menyiapkan…' : 'Export PDF'}
                  <span className="absolute -top-2 -right-2 rotate-3 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 px-1.5 py-px text-[10px] font-extrabold tracking-wider text-white uppercase shadow-sm">
                    New
                  </span>
                </Button>
              )}
              <div className="flex items-center gap-1 rounded-xl border border-border p-1 dark:border-border">
                <button
                  type="button"
                  aria-label="Bulan sebelumnya"
                  onClick={() => stepMonth(-1)}
                  className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground dark:hover:bg-secondary dark:hover:text-foreground"
                >
                  <ChevronLeftIcon className="size-4" />
                </button>
                <select
                  aria-label="Pilih bulan"
                  value={month.getMonth()}
                  onChange={(e) =>
                    setMonth(
                      new Date(month.getFullYear(), Number(e.target.value), 1),
                    )
                  }
                  className="flex cursor-pointer items-center gap-1 rounded-lg bg-transparent px-2 py-1 text-sm font-semibold text-foreground outline-none hover:bg-secondary dark:text-foreground dark:hover:bg-secondary"
                >
                  {MONTHS.map((n, i) => (
                    <option
                      key={n}
                      value={i}
                      className="bg-card text-foreground dark:bg-secondary dark:text-foreground"
                    >
                      {n}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  aria-label="Bulan berikutnya"
                  onClick={() => stepMonth(1)}
                  className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground dark:hover:bg-secondary dark:hover:text-foreground"
                >
                  <ChevronRightIcon className="size-4" />
                </button>
              </div>
            </div>
          </div>

          <HabitScoreNotice tone="green" />
        </m.header>

        {!members || !klass ? (
          <DashboardSkeleton bare />
        ) : selected ? (
          <MemberDetail
            member={selected}
            month={month}
            onBack={() => router.back()}
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Stat
                icon={TrendingUpIcon}
                label="Rata-rata kelas"
                value={`${klass.score}%`}
                hint={`${klass.perfect} hari penuh tercatat`}
                tone="emerald"
                info="Rata-rata keterisian jurnal seluruh anggota bulan ini. Hari sempurna bernilai 100% (100 poin)."
              />
              <Stat
                icon={TrendingUpIcon}
                label="Sedang streak"
                value={`${klass.streaking}`}
                hint="anggota ≥ 3 hari beruntun"
                tone="orange"
                info="Berapa anggota yang sedang punya rentetan minimal 3 hari berturut-turut hadir tepat waktu. Dihitung mundur dari hari ini, jadi tidak ikut berubah saat kamu ganti bulan."
              />
              <Stat
                icon={TrendingUpIcon}
                label="Keterlambatan"
                value={`${klass.late}`}
                hint="absen lewat batas bulan ini"
                tone="sky"
                info="Total kejadian absen lewat batas bulan ini. Batasnya 07:00 pada hari sekolah, dan 06:00 untuk Bangun Pagi di Sabtu dan Minggu."
              />
              <Stat
                icon={TrendingUpIcon}
                label="Perlu perhatian"
                value={`${klass.atRisk}`}
                hint="di bawah 50%"
                tone="rose"
                info="Jumlah anggota dengan rata-rata keterisian bulan ini di bawah 50%. Pakai ini untuk memilih siapa yang perlu ditindaklanjuti lebih dulu."
              />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg font-bold tracking-tight">
                    Tren harian kelas{' '}
                    <InfoHint
                      label="Tren harian kelas"
                      text="Tiap titik adalah satu tanggal: rata-rata keterisian seluruh anggota pada hari itu (0–100%)."
                    />
                  </CardTitle>
                  <CardDescription>
                    Rata-rata keterisian per tanggal.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TrendArea series={klass.trend} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg font-bold tracking-tight">
                    Ketuntasan modul{' '}
                    <InfoHint
                      label="Ketuntasan modul"
                      text="Radar empat sumbu, satu per modul, membandingkan total poin terkumpul dari seluruh anggota kelas dengan target maksimal bulan ini."
                    />
                  </CardTitle>
                  <CardDescription>Rata-rata seluruh anggota.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ModuleRadar
                    stats={klass.modules}
                    totals={klass.moduleTotals}
                    days={klass.elapsedDays}
                    multiplier={klass.studentCount}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg font-bold tracking-tight">
                    Sebaran skor{' '}
                    <InfoHint
                      label="Sebaran skor"
                      text="Berapa anggota yang jatuh di tiap rentang poin. Menunjukkan apakah kelas merata atau terbelah antara yang rajin dan yang tertinggal."
                    />
                  </CardTitle>
                  <CardDescription>Jumlah anggota per rentang.</CardDescription>
                </CardHeader>
                <CardContent>
                  <DistributionBars data={klass.buckets} />
                </CardContent>
              </Card>
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg font-bold tracking-tight">
                    Total poin per modul{' '}
                    <InfoHint
                      label="Total poin per modul"
                      text="Akumulasi seluruh poin yang dikumpulkan seluruh anggota kelas per modul bulan ini dibanding target maksimal."
                    />
                  </CardTitle>
                  <CardDescription>
                    Total poin terkumpul dari seluruh anggota kelas.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ModuleBars
                    stats={klass.modules}
                    totals={klass.moduleTotals}
                    days={klass.elapsedDays}
                    studentCount={klass.studentCount}
                  />
                </CardContent>
              </Card>
            </div>

            <Card className="mt-6">
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg font-bold tracking-tight">
                    Daftar anggota{' '}
                    <InfoHint
                      label="Daftar anggota"
                      text="Kolom Ibadah sampai Belajar adalah persen hari modul itu selesai bulan ini. Hadir memakai batas 07:00 pada hari sekolah dan 06:00 untuk Bangun Pagi di Sabtu dan Minggu."
                    />
                  </CardTitle>
                  <CardDescription>
                    Klik satu nama untuk melihat statistik lengkapnya.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Cari nama atau NIS"
                      className="h-9 w-52 pl-8"
                    />
                  </div>
                  <select
                    aria-label="Urutkan"
                    value={sort}
                    onChange={(e) => setSort(e.target.value as SortKey)}
                    className="h-9 cursor-pointer rounded-lg border border-border bg-card px-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50 dark:border-border dark:bg-secondary dark:text-foreground"
                  >
                    {SORTS.map((s) => (
                      <option
                        key={s.key}
                        value={s.key}
                        className="bg-card text-foreground dark:bg-secondary dark:text-foreground"
                      >
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </CardHeader>
              <CardContent className="px-0">
                {rowsLoading ? (
                  <MemberTableSkeleton />
                ) : (
                  <MemberTable
                    rows={visible}
                    elapsedDays={klass.elapsedDays}
                    onPick={setMember}
                  />
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
