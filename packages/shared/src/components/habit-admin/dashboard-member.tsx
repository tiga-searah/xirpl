'use client';

import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  ClockIcon,
  DumbbellIcon,
  FlameIcon,
  MoonStarIcon,
  NotebookPenIcon,
  ShieldAlertIcon,
} from 'lucide-react';
import { motion as m, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import { cn } from '../../utils';
import { InfoHint } from '../info-hint';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { HeatCalendar, ModuleRadar, TrendArea } from './charts';
import { useHabitAdmin } from './context';
import {
  DashboardSkeleton,
  DetailBlock,
  Pill,
  ProofModal,
  Row,
  Stat,
} from './dashboard-ui';
import type { Member, MemberDay, MemberRow } from './types';

export function MemberTable({
  rows,
  elapsedDays = 1,
  onPick,
}: {
  rows: MemberRow[];
  elapsedDays?: number;
  onPick: (nis: number) => void;
}) {
  const { MODULES } = useHabitAdmin();
  if (!rows.length)
    return (
      <p className="px-4 py-10 text-center text-sm text-muted-foreground">
        Tidak ada anggota yang cocok.
      </p>
    );

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-3xl text-sm">
        <thead>
          <tr className="border-b border-border/70 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase dark:border-border">
            <th className="px-4 py-2.5">Anggota</th>
            <th className="px-4 py-2.5">Rata-rata</th>
            <th className="px-4 py-2.5">Ibadah</th>
            <th className="px-4 py-2.5">Hadir</th>
            <th className="px-4 py-2.5">Olahraga</th>
            <th className="px-4 py-2.5">Belajar</th>
            <th className="px-4 py-2.5">Telat</th>
            <th className="px-4 py-2.5">Absen</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.member.id}
              tabIndex={0}
              onClick={() => onPick(r.member.nis)}
              onKeyDown={(e) => e.key === 'Enter' && onPick(r.member.nis)}
              className="cursor-pointer border-b border-border/50 transition-colors last:border-0 hover:bg-secondary focus-visible:bg-secondary dark:border-border/60 dark:hover:bg-secondary/40 dark:focus-visible:bg-secondary/40"
            >
              <td className="px-4 py-3">
                <p className="font-semibold text-foreground dark:text-foreground">
                  {r.member.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  NIS {r.member.nis}
                </p>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-secondary dark:bg-secondary">
                    <div
                      className={cn('h-full rounded-full', scoreBar(r.score))}
                      style={{ width: `${r.score}%` }}
                    />
                  </div>
                  <span className="font-semibold tabular-nums text-foreground dark:text-foreground">
                    {r.score}%
                  </span>
                </div>
              </td>
              {MODULES.map((mod) => {
                const days = Math.max(1, r.elapsedDays ?? elapsedDays);
                const max = mod.max || 25;
                const target = days * max;
                const collected =
                  r.moduleTotals?.[mod.key] !== undefined
                    ? r.moduleTotals[mod.key]
                    : Math.round((r.modules[mod.key] ?? 0) * days);
                const pct =
                  target > 0 ? Math.round((collected / target) * 100) : 0;
                return (
                  <td
                    key={mod.key}
                    className="px-4 py-3 tabular-nums text-muted-foreground dark:text-foreground"
                  >
                    <span className="font-medium text-foreground dark:text-foreground">
                      {collected}/{target}
                    </span>{' '}
                    <span className="text-xs text-muted-foreground">
                      ({pct}%)
                    </span>
                  </td>
                );
              })}
              <td className="px-4 py-3 tabular-nums text-muted-foreground dark:text-foreground">
                {r.late}
              </td>
              <td className="px-4 py-3 tabular-nums text-muted-foreground dark:text-foreground">
                {r.absent}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const scoreBar = (v: number) =>
  v > 80
    ? 'bg-emerald-500'
    : v > 60
      ? 'bg-lime-400'
      : v > 40
        ? 'bg-yellow-400'
        : v > 20
          ? 'bg-amber-500'
          : 'bg-rose-500';

export function MemberTableSkeleton() {
  return (
    <div className="overflow-x-auto px-4 py-3">
      <Skeleton className="mb-4 h-7 w-full max-w-3xl rounded-lg" />
      <div className="space-y-2.5">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-11 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function MemberDetail({
  member,
  month,
  onBack,
}: {
  member: Member;
  month: Date;
  onBack: () => void;
}) {
  const ctx = useHabitAdmin();
  const {
    fetchMemberDay,
    fetchMemberDetail,
    MODULES,
    MONTHS,
    fmtDate,
    toLocalDate,
  } = ctx;
  const reduce = useReducedMotion();
  const [row, setRow] = useState<Awaited<
    ReturnType<typeof fetchMemberDetail>
  > | null>(null);
  const [day, setDay] = useState<number | null>(null);
  const [detail, setDetail] = useState<MemberDay | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [proof, setProof] = useState<{
    label: string;
    filename: string;
  } | null>(null);

  useEffect(() => {
    let alive = true;
    setRow(null);
    setDay(null);
    setProof(null);
    fetchMemberDetail(member.id, month)
      .then((d) => alive && setRow(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [member.id, month]);

  useEffect(() => {
    if (day === null) {
      setDetail(null);
      setDetailLoading(false);
      return;
    }
    let alive = true;
    setDetail(null);
    setDetailLoading(true);
    const date = fmtDate(new Date(month.getFullYear(), month.getMonth(), day));
    fetchMemberDay(member.id, date)
      .then((d) => alive && setDetail(d))
      .catch(() => alive && setDetail(null))
      .finally(() => alive && setDetailLoading(false));
    return () => {
      alive = false;
    };
  }, [member.id, month, day]);

  if (!row) return <DashboardSkeleton bare />;

  return (
    <m.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="mb-2 flex cursor-pointer items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeftIcon className="size-4" /> Semua anggota
          </button>
          <h2 className="text-2xl font-bold tracking-tight text-foreground dark:text-white">
            {member.name}
          </h2>
          <p className="text-sm text-muted-foreground">
            NIS {member.nis} · {row.logged} dari {row.tracked} hari terisi
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-baseline sm:gap-4">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-nums text-foreground dark:text-foreground">
              {row.totalScore ?? row.score * row.tracked}
            </span>
            <span className="text-sm text-muted-foreground">total poin</span>
          </div>
          <div className="flex items-baseline gap-1.5 border-t border-border/50 pt-1 sm:border-l sm:border-t-0 sm:pt-0 sm:pl-4">
            <span className="text-2xl font-bold tabular-nums text-foreground dark:text-foreground">
              {row.score}%
            </span>
            <span className="text-xs text-muted-foreground">
              rata-rata harian
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          icon={FlameIcon}
          label="Streak berjalan"
          value={`${row.streak}`}
          hint={
            row.since
              ? `terakhir absen ${toLocalDate(row.since).toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })}`
              : 'belum pernah absen'
          }
          tone="orange"
          info="Rentetan hari berturut-turut anggota ini punya catatan absen, dihitung mundur dari absen terakhir lintas bulan. Satu hari terlewat memutusnya."
        />
        <Stat
          icon={CalendarDaysIcon}
          label="Hari penuh"
          value={`${row.perfect}`}
          hint={`dari ${row.tracked} hari`}
          tone="emerald"
          info="Jumlah hari di bulan ini yang keempat modulnya selesai semua. Hari yang cuma sebagian terisi tidak dihitung."
        />
        <Stat
          icon={ClockIcon}
          label="Terlambat"
          value={`${row.late}`}
          hint="absen lewat batas"
          tone="sky"
          info="Berapa kali anggota ini absen lewat batas bulan ini. Batasnya 07:00 pada hari sekolah, dan 06:00 untuk Bangun Pagi di Sabtu dan Minggu — kesiangan, kesorean setelah 15:00, kemalaman setelah 18:00. Tetap tercatat hadir."
        />
        <Stat
          icon={ShieldAlertIcon}
          label="Tanpa absen"
          value={`${row.absent}`}
          hint="tidak tercatat hadir"
          tone="rose"
          info="Hari di bulan ini yang sama sekali tidak diabsen. Beda dengan Terlambat: di sini tidak ada catatan kehadiran sama sekali."
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-bold tracking-tight">
              Tren harian{' '}
              <InfoHint
                label="Tren harian"
                text="Persen ketuntasan anggota ini per tanggal (0–100%)."
              />
            </CardTitle>
            <CardDescription>
              Persentase ketuntasan tiap tanggal.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TrendArea series={row.series} name={member.name} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-bold tracking-tight">
              Profil modul{' '}
              <InfoHint
                label="Profil modul"
                text="Persen ketuntasan per modul untuk anggota ini bulan ini. Angka di daftar bawah radar adalah nilai yang sama dalam bentuk pasti."
              />
            </CardTitle>
            <CardDescription>Kekuatan dan kelemahan.</CardDescription>
          </CardHeader>
          <CardContent>
            <ModuleRadar
              stats={row.modules}
              totals={row.moduleTotals}
              days={row.elapsedDays ?? row.tracked}
            />
            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-border/70 pt-4 dark:border-border">
              {MODULES.map((mod) => {
                const days = Math.max(1, row.elapsedDays ?? row.tracked);
                const max = mod.max || 25;
                const target = days * max;
                const collected =
                  row.moduleTotals?.[mod.key] !== undefined
                    ? row.moduleTotals[mod.key]
                    : Math.round((row.modules[mod.key] ?? 0) * days);
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
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-bold tracking-tight">
              Kalender {MONTHS[month.getMonth()]}{' '}
              <InfoHint
                label="Kalender"
                text="Warna tiap tanggal menunjukkan perolehan poin hari itu. Klik satu tanggal untuk melihat rinciannya di kartu sebelahnya."
              />
            </CardTitle>
            <CardDescription>
              Warna makin pekat berarti makin banyak modul selesai.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <HeatCalendar
              month={month}
              levels={row.levels}
              selected={day}
              onSelect={setDay}
            />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-bold tracking-tight">
              {day === null
                ? 'Rincian hari'
                : `Rincian ${day} ${MONTHS[month.getMonth()]}`}
            </CardTitle>
            <CardDescription>
              {day === null
                ? 'Pilih satu tanggal di kalender.'
                : 'Catatan yang diisi anggota pada tanggal ini.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DayDetail
              day={detail}
              picked={day !== null}
              loading={detailLoading}
              date={
                day === null
                  ? null
                  : new Date(month.getFullYear(), month.getMonth(), day)
              }
              onProofOpen={setProof}
            />
          </CardContent>
        </Card>
      </div>
      <ProofModal
        key={proof?.filename ?? 'closed'}
        proof={proof}
        onClose={() => setProof(null)}
      />
    </m.div>
  );
}

export function DayDetail({
  day,
  picked,
  loading,
  date,
  onProofOpen,
}: {
  day: MemberDay | null;
  picked: boolean;
  loading: boolean;
  date: Date | null;
  onProofOpen: (proof: { label: string; filename: string }) => void;
}) {
  const {
    IBADAH,
    attendanceCopy,
    checkinAt,
    fmtTime,
    isLateCheck,
    lateLabel,
    level,
  } = useHabitAdmin();
  if (!picked)
    return (
      <p className="flex h-40 items-center justify-center rounded-xl bg-secondary text-sm text-muted-foreground dark:bg-secondary/40">
        Belum ada tanggal yang dipilih.
      </p>
    );
  if (loading) return <DayDetailSkeleton />;
  if (!day)
    return (
      <p className="flex h-40 items-center justify-center rounded-xl bg-secondary text-sm text-muted-foreground dark:bg-secondary/40">
        Tidak ada catatan pada tanggal ini.
      </p>
    );

  const { journal, check } = day;
  const copy = attendanceCopy(date ?? new Date());
  const checkedAt = checkinAt(check);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <DetailBlock icon={MoonStarIcon} title="Ibadah" tone="text-violet-500">
        <ul className="space-y-1.5">
          {IBADAH.map(({ label, field }) => (
            <li key={field} className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground dark:text-foreground">
                {label}
              </span>
              <Pill ok={journal?.[field] === true}>
                {journal?.[field] === true ? 'Selesai' : 'Belum'}
              </Pill>
            </li>
          ))}
        </ul>
      </DetailBlock>

      <DetailBlock
        icon={ClockIcon}
        title={copy.title}
        tone="text-sky-500"
        info={
          copy.title === 'Bangun Pagi'
            ? 'Sabtu dan Minggu modul ini jadi Bangun Pagi dengan batas 06:00. Lewat jam itu tetap tercatat, tapi berstatus kesiangan, kesorean setelah 15:00, kemalaman setelah 18:00, dan semuanya memutus streak.'
            : 'Absensi dibuka 06:00. Lewat 07:00 tetap tercatat hadir tapi berstatus terlambat, dan streak anggota putus.'
        }
      >
        {checkedAt ? (
          <p className="text-sm text-muted-foreground dark:text-foreground">
            <span
              className={cn(
                'font-bold',
                isLateCheck(check)
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-emerald-600 dark:text-emerald-400',
              )}
            >
              {isLateCheck(check) ? lateLabel(checkedAt) : copy.ok}
            </span>{' '}
            pada {fmtTime(checkedAt)}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Tidak absen.</p>
        )}
      </DetailBlock>

      <DetailBlock icon={DumbbellIcon} title="Olahraga" tone="text-emerald-500">
        {journal?.did_sport === true ? (
          <dl className="space-y-1 text-sm text-muted-foreground dark:text-foreground">
            <Row label="Jenis" value={journal.sport_type || '—'} />
            <Row
              label="Durasi"
              value={
                journal.sport_duration ? `${journal.sport_duration} menit` : '—'
              }
            />
            <Proofs
              items={[{ label: 'Olahraga', url: journal.sport_proof_url }]}
              onOpen={onProofOpen}
            />
          </dl>
        ) : journal?.did_sport === false ? (
          <p className="text-sm text-muted-foreground dark:text-foreground">
            Tidak olahraga
            {journal.sport_skip_reason
              ? ` — ${journal.sport_skip_reason}`
              : '.'}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Belum dijawab.</p>
        )}
      </DetailBlock>

      <DetailBlock
        icon={NotebookPenIcon}
        title="Gemar Belajar"
        tone="text-amber-500"
      >
        {journal?.did_study === true ? (
          <dl className="space-y-1 text-sm text-muted-foreground dark:text-foreground">
            <Row label="Topik" value={journal.study_about || '—'} />
            <Row label="Media" value={journal.study_media || '—'} />
            <Proofs
              items={[
                { label: 'Mulai', url: journal.study_start_proof_url },
                { label: 'Selesai', url: journal.study_end_proof_url },
              ]}
              onOpen={onProofOpen}
            />
          </dl>
        ) : journal?.did_study === false ? (
          <p className="text-sm text-muted-foreground dark:text-foreground">
            Tidak belajar
            {journal.study_skip_reason
              ? ` — ${journal.study_skip_reason}`
              : '.'}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Belum dijawab.</p>
        )}
      </DetailBlock>

      <p className="text-xs text-muted-foreground sm:col-span-2">
        {level(journal, check)} dari 4 modul selesai pada tanggal ini.
      </p>
    </div>
  );
}

export function DayDetailSkeleton() {
  const blocks = ['ibadah', 'hadir', 'olahraga', 'belajar'] as const;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {blocks.map((block) => (
        <div
          key={block}
          className="rounded-xl bg-secondary p-4 dark:bg-secondary/40"
        >
          <div className="mb-4 flex items-center gap-2">
            <Skeleton className="size-4 rounded-full" />
            <Skeleton className="h-4 w-28" />
          </div>
          <div className="space-y-2.5">
            <Skeleton className="h-3.5 w-4/5" />
            <Skeleton className="h-3.5 w-3/5" />
            <Skeleton className="h-3.5 w-2/3" />
          </div>
        </div>
      ))}
      <Skeleton className="h-3.5 w-56 sm:col-span-2" />
    </div>
  );
}

export function Proofs({
  items,
  onOpen,
}: {
  items: { label: string; url: string | null }[];
  onOpen: (proof: { label: string; filename: string }) => void;
}) {
  return (
    <>
      {items.map((it) => {
        if (!it.url)
          return <Row key={it.label} label={it.label} value="Belum ada" />;
        return (
          <div
            key={it.label}
            className="flex items-center justify-between gap-3"
          >
            <dt className="text-muted-foreground">{it.label}</dt>
            <dd>
              <button
                type="button"
                onClick={() => onOpen({ label: it.label, filename: it.url! })}
                className="font-medium text-sky-600 underline-offset-2 hover:underline dark:text-sky-400"
              >
                Lihat bukti
              </button>
            </dd>
          </div>
        );
      })}
    </>
  );
}
