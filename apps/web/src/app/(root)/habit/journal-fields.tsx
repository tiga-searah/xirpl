'use client';

import { fileUrl } from '@fe/lib/api';
import { Button } from '@xirpl/shared/components/ui/button';
import { Checkbox } from '@fe/components/ui/checkbox';
import { Input } from '@xirpl/shared/components/ui/input';
import { cn } from '@fe/lib/utils';
import {
  CheckIcon,
  ClockIcon,
  DumbbellIcon,
  LoaderCircleIcon,
  LockIcon,
  MoonStarIcon,
  NotebookPenIcon,
  UploadIcon,
  XIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { AnimatePresence, motion as m } from 'motion/react';
import type { ReactNode } from 'react';
import type { UploadProgress } from './journal';
import { type Journal, type Check, type ModuleKey } from '../../../../data/habit-data';
import {
  IBADAH,
  SPORT_TYPES,
  attendanceCopy,
  attendanceWindow,
  checkinAt,
  fmtTime,
  isLateCheck,
  isWakeDay,
  lateLabel,
} from '../../../../data/habit-data';
import { InfoHint } from './widgets';

/** Instant visual feedback: a check that springs in when something is logged. */
function Tick({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <m.span
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 28 }}
          className="inline-flex size-5 items-center justify-center rounded-full bg-emerald-500 text-white"
        >
          <CheckIcon className="size-3" strokeWidth={3} />
        </m.span>
      )}
    </AnimatePresence>
  );
}

function Reveal({
  show,
  reduce,
  children,
}: {
  show: boolean;
  reduce: boolean | null;
  children: ReactNode;
}) {
  return (
    <AnimatePresence initial={false}>
      {show && (
        <m.div
          initial={reduce ? false : { height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden"
        >
          {children}
        </m.div>
      )}
    </AnimatePresence>
  );
}

const TONES: Record<ModuleKey, string> = {
  ibadah: 'text-violet-500',
  hadir: 'text-sky-500',
  olahraga: 'text-emerald-500',
  belajar: 'text-amber-500',
};

/** Flat section: hairline divider instead of a card, no elevation. */
function Section({
  icon: Icon,
  title,
  info,
  tone,
  index,
  done,
  reduce,
  first,
  last,
  children,
}: {
  icon: LucideIcon;
  title: string;
  info: string;
  tone: ModuleKey;
  index: number;
  done: boolean;
  reduce: boolean | null;
  first?: boolean;
  last?: boolean;
  children: ReactNode;
}) {
  return (
    <m.section
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.4 }}
      className={cn(
        'border-border/70 py-8 dark:border-border',
        !first && 'border-t',
        first && 'pt-0',
        last && 'pb-0',
      )}
    >
      <h2 className="mb-5 flex items-center gap-2.5">
        <Icon className={cn('size-5', TONES[tone])} />
        <span className="text-xl font-bold tracking-tight text-foreground dark:text-foreground">
          {title}
        </span>
        <InfoHint label={title} text={info} />
        <Tick show={done} />
      </h2>
      {children}
    </m.section>
  );
}

const formatBytes = (n: number) =>
  n >= 1024 ** 2
    ? `${(n / 1024 ** 2).toFixed(1)} MB`
    : n >= 1024
      ? `${Math.round(n / 1024)} KB`
      : `${n} B`;

function PhotoBox({
  label,
  photo,
  disabled,
  uploading,
  lockedHint,
  onPick,
  onClear,
}: {
  label: string;
  photo: string | null;
  disabled: boolean;
  uploading?: UploadProgress | null;
  lockedHint?: string;
  onPick: (file: File | undefined) => void;
  onClear: () => void;
}) {
  const pct = uploading
    ? Math.min(99, Math.round((uploading.sent / uploading.total) * 100))
    : 0;
  return (
    <div className="flex flex-col gap-2">
      <span className="flex items-center gap-2 text-sm font-medium text-foreground dark:text-foreground">
        {label}
        <Tick show={!!photo} />
      </span>
      <div className="relative">
        {photo && !disabled && (
          <button
            type="button"
            onClick={onClear}
            aria-label={`Hapus ${label.toLowerCase()}`}
            className="absolute top-2 right-2 z-10 grid size-8 cursor-pointer place-items-center rounded-full bg-brand-navy/70 text-white transition-colors hover:bg-brand-navy/90 focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none"
          >
            <XIcon className="size-4" />
          </button>
        )}
        <label
          className={cn(
            'relative flex flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-secondary/60 transition-colors dark:border-border dark:bg-secondary/40',
            !photo && 'min-h-36',
            photo && 'h-64',
            disabled
              ? 'cursor-not-allowed opacity-70'
              : 'cursor-pointer hover:border-border hover:bg-secondary/60 dark:hover:border-border',
          )}
        >
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={disabled}
            onChange={(e) => onPick(e.target.files?.[0])}
          />
          {photo ? (
            <img
              src={fileUrl(photo)}
              alt={label}
              className="absolute inset-0 size-full object-contain"
            />
          ) : uploading ? (
            <>
              <LoaderCircleIcon className="mb-2 size-6 animate-spin text-muted-foreground" />
              <p className="mb-1.5 text-sm font-semibold text-muted-foreground">
                {pct}%
              </p>
              <div className="h-1.5 w-2/3 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-foreground transition-[width] duration-200"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {formatBytes(uploading.sent)} / {formatBytes(uploading.total)}
              </p>
              {uploading.sent >= uploading.total && (
                <p className="mt-1 text-xs font-medium text-muted-foreground">
                  Sedang dikompres…
                </p>
              )}
            </>
          ) : (
            <>
              {lockedHint ? (
                <LockIcon className="mb-2 size-6 text-muted-foreground" />
              ) : (
                <UploadIcon className="mb-2 size-6 text-muted-foreground" />
              )}
              <p className="text-sm text-muted-foreground">
                {lockedHint ?? 'Klik untuk upload'}
              </p>
              {!lockedHint && (
                <p className="text-xs text-muted-foreground">
                  Otomatis dikompres
                </p>
              )}
            </>
          )}
        </label>
      </div>
    </div>
  );
}

/** Yes / No / unanswered. Clicking the active choice clears it back to null. */
function TriState({
  value,
  disabled,
  label,
  onChange,
}: {
  value: boolean | null;
  disabled: boolean;
  label: string;
  onChange: (v: boolean | null) => void;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex shrink-0 overflow-hidden rounded-lg border border-border dark:border-border"
    >
      {[true, false].map((choice) => {
        const active = value === choice;
        return (
          <button
            key={String(choice)}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            onClick={() => onChange(active ? null : choice)}
            className={cn(
              'px-3 py-1.5 text-xs font-semibold transition-colors',
              !disabled && 'cursor-pointer',
              disabled && 'cursor-not-allowed opacity-60',
              choice ? 'border-r border-border dark:border-border' : undefined,
              active && choice && 'bg-emerald-500 text-white',
              active && !choice && 'bg-muted-foreground text-white',
              !active &&
                'bg-transparent text-muted-foreground hover:bg-secondary',
            )}
          >
            {choice ? 'Ya' : 'Tidak'}
          </button>
        );
      })}
    </div>
  );
}

function Question({
  text,
  value,
  disabled,
  onChange,
}: {
  text: string;
  value: boolean | null;
  disabled: boolean;
  onChange: (v: boolean | null) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm font-medium text-foreground dark:text-foreground">
        {text}
      </p>
      <TriState
        value={value}
        disabled={disabled}
        label={text}
        onChange={onChange}
      />
    </div>
  );
}

function Field({
  label,
  hint,
  done,
  children,
}: {
  label: string;
  hint?: string;
  done?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <span className="flex items-center gap-2 text-sm font-medium text-foreground dark:text-foreground">
        {label}
        <Tick show={!!done} />
      </span>
      {children}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}

export function JournalFields({
  data,
  editable,
  busy,
  uploading,
  reduce,
  selected,
  now,
  check,
  status,
  update,
  pickPhoto,
  checkIn,
}: {
  data: Journal;
  editable: boolean;
  busy: boolean;
  uploading: UploadProgress | null;
  reduce: boolean | null;
  selected: Date;
  now: Date;
  check: Check | null;
  status: { ibadah: boolean; hadir: boolean; olahraga: boolean; belajar: boolean };
  update: (fn: (prev: Journal) => Journal) => void;
  pickPhoto: (
    file: File | undefined,
    field: string,
    apply: (prev: Journal, filename: string) => Journal,
  ) => Promise<void>;
  checkIn: () => void;
}) {
  const copy = attendanceCopy(selected);
  const checkedAt = checkinAt(check);
  const gate = attendanceWindow(now);

  return (
    <>
      <Section
        icon={MoonStarIcon}
        title="Ibadah"
        tone="ibadah"
        index={0}
        info="Centang tiap salat sunah yang kamu kerjakan hari ini. Modul dihitung selesai hanya kalau keempatnya tercentang."
        done={status.ibadah}
        reduce={reduce}
        first
      >
        <ul className="divide-y divide-border/70 dark:divide-border">
          {IBADAH.map(({ label, field }) => (
            <li key={field}>
              <div
                className={cn(
                  'flex items-center gap-3 py-3',
                  editable ? 'cursor-pointer' : 'cursor-not-allowed opacity-70',
                )}
              >
                <Checkbox
                  id={field}
                  checked={data[field] === true}
                  disabled={!editable}
                  onCheckedChange={(checked) =>
                    update((d) => ({
                      ...d,
                      [field]: typeof checked === 'boolean' ? checked : null,
                    }))
                  }
                />
                <label
                  htmlFor={field}
                  className={cn(
                    'text-sm font-medium text-foreground dark:text-foreground',
                    editable && 'cursor-pointer',
                  )}
                >
                  {label}
                </label>
                <span className="ml-auto">
                  <Tick show={data[field] === true} />
                </span>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        icon={ClockIcon}
        title={copy.title}
        tone="hadir"
        index={1}
        info={
          isWakeDay(selected)
            ? 'Sabtu, Minggu, dan hari libur nasional modul ini jadi Bangun Pagi: tekan tombolnya paling lambat 06:00. Lewat jam itu tetap tercatat, tapi berstatus kesiangan, kesorean setelah 15:00, kemalaman setelah 18:00, dan semuanya memutus streak.'
            : 'Tekan tombolnya untuk absen. Dibuka 06:00, dan lewat 07:00 tercatat terlambat sehingga streak putus. Waktu absen ikut tersimpan.'
        }
        done={status.hadir}
        reduce={reduce}
      >
        {checkedAt && (
          <p className="mb-4 text-sm">
            <span
              className={cn(
                'font-bold',
                isLateCheck(check)
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-emerald-600 dark:text-emerald-400',
              )}
            >
              {isLateCheck(check) ? lateLabel(checkedAt) : copy.ok}
            </span>
            <span className="text-muted-foreground"> pada {fmtTime(checkedAt)}</span>
          </p>
        )}
        <Button
          variant="special"
          size="lg"
          pointer
          disabled={!editable || !!checkedAt || gate === 'closed' || busy}
          className="w-full border-[#1565c0] sm:w-auto sm:min-w-48"
          onClick={checkIn}
        >
          {checkedAt ? (
            <>
              <CheckIcon /> {copy.doneAction}
            </>
          ) : !editable ? (
            'Tidak tercatat'
          ) : gate === 'closed' ? (
            'Absensi belum dibuka'
          ) : (
            copy.action
          )}
        </Button>
        {!checkedAt && editable && (
          <p className="mt-2 text-xs text-muted-foreground">
            {gate === 'closed'
              ? 'Absensi dibuka pukul 06:00.'
              : gate === 'open'
                ? `${copy.verb} sebelum ${copy.deadline} supaya tidak tercatat ${copy.late.toLowerCase()}.`
                : `Lewat ${copy.deadline}, ${copy.noun} akan tercatat ${lateLabel(now).toLowerCase()}.`}
          </p>
        )}
        {!checkedAt && !editable && (
          <p className="mt-2 text-xs text-muted-foreground">
            Tidak ada catatan {copy.noun} pada tanggal ini.
          </p>
        )}
      </Section>

      <Section
        icon={DumbbellIcon}
        title="Olahraga"
        tone="olahraga"
        index={2}
        info="Jawab Ya lalu isi jenis, durasi, dan foto bukti. Modul dihitung selesai setelah fotonya masuk. Jawab Tidak tetap dicatat beserta alasannya, tapi tidak menambah skor hari itu."
        done={status.olahraga}
        reduce={reduce}
      >
        <Question
          text="Apakah kamu berolahraga hari ini?"
          value={data.did_sport}
          disabled={!editable}
          onChange={(done) =>
            update((d) => ({
              ...d,
              did_sport: done,
              sport_skip_reason: null,
              ...(done === true
                ? {}
                : {
                    sport_type: null,
                    sport_duration: null,
                    sport_proof_url: null,
                  }),
            }))
          }
        />

        <Reveal show={data.did_sport === true} reduce={reduce}>
          <div className="grid gap-4 pt-4 sm:grid-cols-2">
            <Field label="Olahraga apa yang kamu lakukan?">
              <select
                value={data.sport_type ?? ''}
                disabled={!editable}
                onChange={(e) =>
                  update((d) => ({
                    ...d,
                    sport_type: e.target.value || null,
                  }))
                }
                className="h-9 w-full cursor-pointer rounded-lg border border-border bg-card px-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-border dark:bg-secondary dark:text-foreground"
              >
                <option value="" className="bg-card text-foreground dark:bg-secondary dark:text-foreground">
                  Pilih jenis olahraga
                </option>
                {SPORT_TYPES.map((s) => (
                  <option key={s} value={s} className="bg-card text-foreground dark:bg-secondary dark:text-foreground">
                    {s}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Berapa menit kamu berolahraga?">
              <Input
                type="number"
                min={1}
                max={600}
                inputMode="numeric"
                placeholder="30"
                disabled={!editable}
                value={data.sport_duration ?? ''}
                onChange={(e) =>
                  update((d) => ({
                    ...d,
                    sport_duration: e.target.value ? Number(e.target.value) : null,
                  }))
                }
                className="h-9"
              />
            </Field>

            <div className="sm:col-span-2">
              <PhotoBox
                label="Mana bukti olahragamu?"
                photo={data.sport_proof_url}
                disabled={!editable || busy}
                uploading={uploading?.field === 'sport_proof_url' ? uploading : null}
                onPick={(file) =>
                  pickPhoto(file, 'sport_proof_url', (d, sport_proof_url) => ({
                    ...d,
                    sport_proof_url,
                  }))
                }
                onClear={() => update((d) => ({ ...d, sport_proof_url: null }))}
              />
            </div>
          </div>
        </Reveal>

        <Reveal show={data.did_sport === false} reduce={reduce}>
          <div className="pt-4">
            <Field label="Kenapa kamu tidak berolahraga?" done={!!data.sport_skip_reason?.trim()}>
              <Input
                placeholder="Contoh: saya capek"
                disabled={!editable}
                value={data.sport_skip_reason ?? ''}
                onChange={(e) => update((d) => ({ ...d, sport_skip_reason: e.target.value }))}
                className="h-9"
              />
            </Field>
          </div>
        </Reveal>
      </Section>

      <Section
        icon={NotebookPenIcon}
        title="Gemar Belajar"
        tone="belajar"
        index={3}
        info="Jawab Ya lalu isi topik, media, dan dua foto bukti (mulai dan selesai). Modul baru dihitung selesai setelah keduanya terupload. Jawab Tidak tetap dicatat beserta alasannya, tapi tidak menambah skor hari itu."
        done={status.belajar}
        reduce={reduce}
        last
      >
        <Question
          text="Apakah kamu belajar hari ini?"
          value={data.did_study}
          disabled={!editable}
          onChange={(done) =>
            update((d) => ({
              ...d,
              did_study: done,
              study_skip_reason: null,
              ...(done === true
                ? {}
                : {
                    study_about: null,
                    study_media: null,
                    study_start_proof_url: null,
                    study_end_proof_url: null,
                  }),
            }))
          }
        />

        <Reveal show={data.did_study === true} reduce={reduce}>
          <div className="grid gap-4 pt-4 sm:grid-cols-2">
            <Field label="Kamu belajar tentang apa?">
              <Input
                placeholder="Contoh: struktur data - linked list"
                disabled={!editable}
                value={data.study_about ?? ''}
                onChange={(e) => update((d) => ({ ...d, study_about: e.target.value }))}
                className="h-9"
              />
            </Field>

            <Field label="Kamu belajar pakai media apa?">
              <Input
                placeholder="Contoh: buku paket, video YouTube"
                disabled={!editable}
                value={data.study_media ?? ''}
                onChange={(e) => update((d) => ({ ...d, study_media: e.target.value }))}
                className="h-9"
              />
            </Field>

            <PhotoBox
              label="Mana bukti kamu mulai belajar?"
              photo={data.study_start_proof_url}
              disabled={!editable || busy}
              uploading={
                uploading?.field === 'study_start_proof_url' ? uploading : null
              }
              onPick={(file) =>
                pickPhoto(file, 'study_start_proof_url', (d, study_start_proof_url) => ({
                  ...d,
                  study_start_proof_url,
                }))
              }
              onClear={() =>
                update((d) => ({
                  ...d,
                  study_start_proof_url: null,
                  study_end_proof_url: null,
                }))
              }
            />
            <PhotoBox
              label="Mana bukti kamu selesai belajar?"
              photo={data.study_end_proof_url}
              disabled={!editable || busy || !data.study_start_proof_url}
              lockedHint={data.study_start_proof_url ? undefined : 'Upload bukti mulai dulu'}
              uploading={
                uploading?.field === 'study_end_proof_url' ? uploading : null
              }
              onPick={(file) =>
                pickPhoto(file, 'study_end_proof_url', (d, study_end_proof_url) => ({
                  ...d,
                  study_end_proof_url,
                }))
              }
              onClear={() => update((d) => ({ ...d, study_end_proof_url: null }))}
            />

            {!(data.study_start_proof_url && data.study_end_proof_url) && (
              <p className="text-xs text-muted-foreground sm:col-span-2">
                Status belajar baru tercatat setelah kedua bukti terupload.
              </p>
            )}
          </div>
        </Reveal>

        <Reveal show={data.did_study === false} reduce={reduce}>
          <div className="pt-4">
            <Field label="Kenapa kamu tidak belajar?" done={!!data.study_skip_reason?.trim()}>
              <Input
                placeholder="Contoh: saya tertidur"
                disabled={!editable}
                value={data.study_skip_reason ?? ''}
                onChange={(e) => update((d) => ({ ...d, study_skip_reason: e.target.value }))}
                className="h-9"
              />
            </Field>
          </div>
        </Reveal>
      </Section>
    </>
  );
}
