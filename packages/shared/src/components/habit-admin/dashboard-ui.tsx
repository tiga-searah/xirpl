'use client';

import {
  type ClockIcon,
  ShieldAlertIcon,
  type UsersIcon,
  XIcon,
} from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { cn } from '../../utils';
import { InfoHint } from '../info-hint';
import { Card, CardContent } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { useHabitAdmin } from './context';

export function ProofModal({
  proof,
  onClose,
}: {
  proof: { label: string; filename: string } | null;
  onClose: () => void;
}) {
  const { fileUrl } = useHabitAdmin();
  const [imgError, setImgError] = useState(false);
  if (!proof) return null;
  const imageUrl = fileUrl(proof.filename);

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-navy/70 p-4 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Bukti ${proof.label}`}
        className="border-border bg-card duo-card relative max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-3xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3 dark:border-border">
          <h3 className="font-semibold text-foreground dark:text-foreground">
            Bukti {proof.label}
          </h3>
          <button
            type="button"
            aria-label="Tutup bukti"
            onClick={onClose}
            className="flex size-9 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground dark:hover:bg-secondary dark:hover:text-foreground"
          >
            <XIcon className="size-5" />
          </button>
        </div>
        <div className="flex max-h-[calc(90vh-4rem)] flex-col items-center gap-2 overflow-auto bg-secondary p-3 dark:bg-card">
          {imgError ? (
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm text-muted-foreground">
                Gambar gagal dimuat
              </p>
              <a
                href={imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground text-xs font-medium underline underline-offset-2"
              >
                Buka di tab baru
              </a>
            </div>
          ) : (
            <img
              src={imageUrl}
              alt={`Bukti ${proof.label}`}
              onError={() => setImgError(true)}
              className="h-auto w-auto max-h-[calc(90vh-6rem)] max-w-full rounded-lg object-contain"
            />
          )}
        </div>
      </div>
    </div>
  );
}

export function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium text-foreground dark:text-foreground">
        {value}
      </dd>
    </div>
  );
}

export function Pill({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-xs font-semibold',
        ok
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
          : 'bg-secondary text-muted-foreground dark:bg-secondary',
      )}
    >
      {children}
    </span>
  );
}

export function DetailBlock({
  icon: Icon,
  title,
  tone,
  info,
  children,
}: {
  icon: typeof ClockIcon;
  title: string;
  tone: string;
  info?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl bg-secondary p-4 dark:bg-secondary/40">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground dark:text-foreground">
        <Icon className={cn('size-4', tone)} />
        {title}
        {info && <InfoHint label={title} text={info} />}
      </h3>
      {children}
    </div>
  );
}

export const TONES = {
  emerald: 'bg-emerald-500',
  orange: 'bg-orange-500',
  sky: 'bg-sky-500',
  rose: 'bg-rose-500',
} as const;

export function Stat({
  icon: Icon,
  label,
  value,
  hint,
  tone,
  info,
}: {
  icon: typeof UsersIcon;
  label: string;
  value: string;
  hint: string;
  tone: keyof typeof TONES;
  info: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3">
        <span
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-xl text-white',
            TONES[tone],
          )}
        >
          <Icon className="size-4.5" />
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            {label}
            <InfoHint label={label} text={info} />
          </p>
          <p className="text-2xl leading-tight font-bold tabular-nums text-foreground dark:text-foreground">
            {value}
          </p>
          <p className="truncate text-xs text-muted-foreground">{hint}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function Guard({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action: ReactNode;
}) {
  return (
    <div className="bg-background flex min-h-screen items-center justify-center px-4">
      <Card className="max-w-md text-center">
        <CardContent className="flex flex-col items-center gap-3 py-6">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-rose-500 text-white">
            <ShieldAlertIcon className="size-6" />
          </span>
          <h1 className="text-xl font-bold text-foreground dark:text-white">
            {title}
          </h1>
          <p className="text-sm text-muted-foreground">{body}</p>
          <div className="mt-2">{action}</div>
        </CardContent>
      </Card>
    </div>
  );
}

export function DashboardSkeleton({ bare }: { bare?: boolean }) {
  const body = (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {['skor', 'streak', 'telat', 'perhatian'].map((k) => (
          <Skeleton key={k} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Skeleton className="h-72 rounded-xl lg:col-span-2" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
      <Skeleton className="mt-6 h-96 rounded-xl" />
    </>
  );
  if (bare) return body;
  return (
    <div className="bg-background min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Skeleton className="mb-8 h-10 w-64 rounded-xl" />
        {body}
      </div>
    </div>
  );
}
