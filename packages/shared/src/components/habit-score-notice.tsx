'use client';

import {
  BookOpenIcon,
  CheckIcon,
  ClockIcon,
  DumbbellIcon,
  MoonStarIcon,
  SparklesIcon,
  XIcon,
} from 'lucide-react';
import { AnimatePresence, motion as m, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import { cn } from '../utils';
import XiRplMascot from './mascot';
import { Button } from './ui/button';

const NOTICE_STORAGE_KEY = 'xirpl:habit-score-notice:v1';

export function HabitScoreNotice({
  className,
  tone = 'blue',
}: {
  className?: string;
  tone?: 'blue' | 'green';
}) {
  const reduce = useReducedMotion();
  const [showNotice, setShowNotice] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const isGreen = tone === 'green';

  useEffect(() => {
    try {
      const isDismissed = localStorage.getItem(NOTICE_STORAGE_KEY) === 'true';
      if (!isDismissed) {
        setShowNotice(true);
      }
    } catch {
      setShowNotice(true);
    }
  }, []);

  const dismissNotice = () => {
    setShowNotice(false);
    try {
      localStorage.setItem(NOTICE_STORAGE_KEY, 'true');
    } catch {
      // Ignore localStorage write error
    }
  };

  return (
    <>
      <AnimatePresence>
        {showNotice && (
          <m.div
            initial={reduce ? false : { opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
            exit={reduce ? undefined : { opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className={cn('overflow-hidden', className)}
          >
            <aside
              aria-label="Pemberitahuan Perubahan Sistem Poin"
              className={cn(
                'duo-card inline-flex w-full sm:w-auto items-center justify-between gap-3 rounded-2xl border-2 px-4 py-2.5 text-sm shadow-xs',
                isGreen
                  ? 'border-emerald-500/40 bg-pastel-green/70 text-foreground [--duo-shade:rgba(16,185,129,0.3)] dark:border-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-100'
                  : 'border-brand-blue/40 bg-pastel-blue/60 text-foreground [--duo-shade:rgba(30,136,229,0.25)] dark:border-blue-500/40 dark:bg-blue-950/40 dark:text-blue-100',
              )}
            >
              <p className="flex flex-wrap items-center gap-2 leading-snug">
                <span
                  className={cn(
                    'duo-card inline-flex items-center rounded-full border-transparent px-2.5 py-0.5 text-[10px] font-black tracking-wide text-white uppercase [--duo-depth:2px]',
                    isGreen
                      ? 'bg-emerald-600 [--duo-shade:#047857]'
                      : 'bg-brand-blue [--duo-shade:#1565c0]',
                  )}
                >
                  BARU
                </span>
                <span
                  className={cn(
                    'font-extrabold',
                    isGreen
                      ? 'text-emerald-950 dark:text-emerald-100'
                      : 'text-brand-navy dark:text-blue-100',
                  )}
                >
                  Perubahan sistem poin di Jurnal Kebiasaan.
                </span>
                <button
                  type="button"
                  onClick={() => setOpenModal(true)}
                  className={cn(
                    'cursor-pointer font-extrabold underline underline-offset-4 transition-colors',
                    isGreen
                      ? 'text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200'
                      : 'text-brand-blue hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200',
                  )}
                >
                  Lihat Selengkapnya
                </button>
              </p>

              <button
                type="button"
                onClick={dismissNotice}
                aria-label="Tutup pemberitahuan"
                className="cursor-pointer ml-1 -mr-1 flex size-7 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-black/5 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <XIcon className="size-4" />
              </button>
            </aside>
          </m.div>
        )}
      </AnimatePresence>

      <HabitScoreModal
        open={openModal}
        tone={tone}
        onClose={() => setOpenModal(false)}
      />
    </>
  );
}

export function HabitScoreModal({
  open,
  tone = 'blue',
  onClose,
}: {
  open: boolean;
  tone?: 'blue' | 'green';
  onClose: () => void;
}) {
  const reduce = useReducedMotion();
  const isGreen = tone === 'green';

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <m.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="score-modal-title"
        initial={reduce ? false : { opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={reduce ? undefined : { opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="duo-card relative max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-3xl border-2 border-border/80 bg-card shadow-2xl [--duo-shade:rgba(0,0,0,0.25)] dark:[--duo-shade:rgba(0,0,0,0.5)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        {/* Header with playful mascot */}
        <div
          className={cn(
            'relative overflow-hidden border-b-2 p-6',
            isGreen
              ? 'border-emerald-500/30 bg-pastel-green/70 dark:border-emerald-500/20 dark:bg-emerald-950/40'
              : 'border-brand-blue/20 bg-pastel-blue/60 dark:border-blue-500/20 dark:bg-blue-950/40',
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5 max-w-lg">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'duo-card inline-flex items-center rounded-full border-transparent px-3 py-1 text-xs font-black tracking-wide text-white uppercase [--duo-depth:3px]',
                    isGreen
                      ? 'bg-emerald-600 [--duo-shade:#047857]'
                      : 'bg-brand-blue [--duo-shade:#1565c0]',
                  )}
                >
                  BARU
                </span>
                <span
                  className={cn(
                    'text-xs font-black tracking-wider uppercase',
                    isGreen
                      ? 'text-emerald-900 dark:text-emerald-200'
                      : 'text-brand-navy dark:text-blue-200',
                  )}
                >
                  Pembaruan Fitur
                </span>
              </div>
              <h3
                id="score-modal-title"
                className={cn(
                  'font-display text-2xl font-black tracking-tight',
                  isGreen
                    ? 'text-emerald-950 dark:text-white'
                    : 'text-brand-navy dark:text-white',
                )}
              >
                Sistem Poin Jurnal Kebiasaan
              </h3>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                Setiap hari bernilai maksimal <strong>100 poin</strong> dengan
                pembagian bobot <strong>30-20-25-25</strong>. Tiap field kini
                menghasilkan poin langsung tanpa harus menunggu satu modul
                selesai penuh!
              </p>
            </div>

            <div className="hidden sm:block shrink-0 -mr-2 -mt-2">
              <XiRplMascot pose="cheer" size={96} />
            </div>

            <button
              type="button"
              aria-label="Tutup modal"
              onClick={onClose}
              className="cursor-pointer -mr-2 -mt-2 flex size-8 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-black/5 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white sm:hidden"
            >
              <XIcon className="size-5" />
            </button>
          </div>
        </div>

        {/* Scrollable body with cards */}
        <div className="max-h-[calc(90vh-14rem)] overflow-y-auto p-5 sm:p-6 space-y-4">
          <div className="grid gap-3.5 sm:grid-cols-2">
            {/* Kehadiran */}
            <div className="duo-card flex flex-col justify-between rounded-2xl border-2 border-sky-300/80 bg-pastel-blue/40 p-4 [--duo-shade:rgba(14,165,233,0.3)] dark:border-sky-500/30 dark:bg-sky-950/20">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-sky-500 text-white shadow-xs">
                      <ClockIcon className="size-4" />
                    </span>
                    <h4 className="font-extrabold text-sm text-foreground dark:text-foreground">
                      Kehadiran / Bangun Pagi
                    </h4>
                  </div>
                  <span className="duo-card shrink-0 rounded-full border-transparent bg-sky-500 px-2.5 py-0.5 text-xs font-black text-white uppercase [--duo-depth:2px] [--duo-shade:#0284c7]">
                    30 Poin
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
                  Berkurang 1 poin tiap jam keterlambatan:
                </p>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-baseline justify-between rounded-lg bg-card/60 px-2.5 py-1.5 border border-border/50">
                    <span className="text-muted-foreground">
                      Hari Sekolah (&lt; 07:01)
                    </span>
                    <span className="font-extrabold text-sky-600 dark:text-sky-400">
                      30 poin
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between rounded-lg bg-card/60 px-2.5 py-1.5 border border-border/50">
                    <span className="text-muted-foreground">
                      07:01–08:00 WIB
                    </span>
                    <span className="font-bold text-foreground">29 poin</span>
                  </div>
                  <div className="flex items-baseline justify-between rounded-lg bg-card/60 px-2.5 py-1.5 border border-border/50">
                    <span className="text-muted-foreground">
                      Libur/Weekend (&lt; 06:01)
                    </span>
                    <span className="font-extrabold text-sky-600 dark:text-sky-400">
                      30 poin
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Ibadah */}
            <div className="duo-card flex flex-col justify-between rounded-2xl border-2 border-violet-300/80 bg-pastel-purple/40 p-4 [--duo-shade:rgba(139,92,246,0.3)] dark:border-violet-500/30 dark:bg-violet-950/20">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-violet-500 text-white shadow-xs">
                      <MoonStarIcon className="size-4" />
                    </span>
                    <h4 className="font-extrabold text-sm text-foreground dark:text-foreground">
                      Ibadah Sunah
                    </h4>
                  </div>
                  <span className="duo-card shrink-0 rounded-full border-transparent bg-violet-500 px-2.5 py-0.5 text-xs font-black text-white uppercase [--duo-depth:2px] [--duo-shade:#6d28d9]">
                    20 Poin
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
                  Poin langsung masuk saat dicentang:
                </p>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  <div className="flex items-center justify-between rounded-lg bg-card/60 px-2.5 py-1.5 border border-border/50">
                    <span className="text-muted-foreground">Tahajud</span>
                    <span className="font-extrabold text-violet-600 dark:text-violet-400">
                      +7 poin
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-card/60 px-2.5 py-1.5 border border-border/50">
                    <span className="text-muted-foreground">Duha</span>
                    <span className="font-extrabold text-violet-600 dark:text-violet-400">
                      +5 poin
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-card/60 px-2.5 py-1.5 border border-border/50">
                    <span className="text-muted-foreground">Qobliyah</span>
                    <span className="font-extrabold text-violet-600 dark:text-violet-400">
                      +4 poin
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-card/60 px-2.5 py-1.5 border border-border/50">
                    <span className="text-muted-foreground">Ba'diyah</span>
                    <span className="font-extrabold text-violet-600 dark:text-violet-400">
                      +4 poin
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Olahraga */}
            <div className="duo-card flex flex-col justify-between rounded-2xl border-2 border-emerald-300/80 bg-pastel-green/40 p-4 [--duo-shade:rgba(16,185,129,0.3)] dark:border-emerald-500/30 dark:bg-emerald-950/20">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-500 text-white shadow-xs">
                      <DumbbellIcon className="size-4" />
                    </span>
                    <h4 className="font-extrabold text-sm text-foreground dark:text-foreground">
                      Olahraga
                    </h4>
                  </div>
                  <span className="duo-card shrink-0 rounded-full border-transparent bg-emerald-500 px-2.5 py-0.5 text-xs font-black text-white uppercase [--duo-depth:2px] [--duo-shade:#059669]">
                    25 Poin
                  </span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between rounded-lg bg-card/60 px-2.5 py-1.5 border border-border/50">
                    <span className="text-muted-foreground">Jawaban "Ya"</span>
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                      +3 poin
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-card/60 px-2.5 py-1.5 border border-border/50">
                    <span className="text-muted-foreground">
                      Jenis & Durasi
                    </span>
                    <span className="font-bold text-foreground">
                      masing-masing +5 poin
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-card/60 px-2.5 py-1.5 border border-border/50">
                    <span className="text-muted-foreground">Foto Bukti</span>
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                      +12 poin
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-card/40 px-2.5 py-1 text-[11px] text-muted-foreground">
                    <span>Jika Tidak (Tidak=1 + Alasan=2)</span>
                    <span className="font-semibold text-foreground">
                      total 3 poin
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Gemar Belajar */}
            <div className="duo-card flex flex-col justify-between rounded-2xl border-2 border-amber-300/80 bg-pastel-yellow/40 p-4 [--duo-shade:rgba(245,158,11,0.3)] dark:border-amber-500/30 dark:bg-amber-950/20">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-amber-500 text-white shadow-xs">
                      <BookOpenIcon className="size-4" />
                    </span>
                    <h4 className="font-extrabold text-sm text-foreground dark:text-foreground">
                      Gemar Belajar
                    </h4>
                  </div>
                  <span className="duo-card shrink-0 rounded-full border-transparent bg-amber-500 px-2.5 py-0.5 text-xs font-black text-white uppercase [--duo-depth:2px] [--duo-shade:#d97706]">
                    25 Poin
                  </span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between rounded-lg bg-card/60 px-2.5 py-1.5 border border-border/50">
                    <span className="text-muted-foreground">Jawaban "Ya"</span>
                    <span className="font-extrabold text-amber-600 dark:text-amber-400">
                      +3 poin
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-card/60 px-2.5 py-1.5 border border-border/50">
                    <span className="text-muted-foreground">Topik & Media</span>
                    <span className="font-bold text-foreground">
                      masing-masing +4 poin
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-card/60 px-2.5 py-1.5 border border-border/50">
                    <span className="text-muted-foreground">
                      Bukti Mulai & Selesai
                    </span>
                    <span className="font-extrabold text-amber-600 dark:text-amber-400">
                      masing-masing +7 poin
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-card/40 px-2.5 py-1 text-[11px] text-muted-foreground">
                    <span>Jika Tidak (Tidak=1 + Alasan=2)</span>
                    <span className="font-semibold text-foreground">
                      total 3 poin
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Highlight feature note */}
          <div className="duo-card rounded-2xl border-2 border-brand-yellow/60 bg-pastel-yellow/70 p-4 text-xs [--duo-shade:#e0a800] dark:border-amber-500/30 dark:bg-amber-950/30">
            <div className="flex items-start gap-2.5">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-brand-yellow text-brand-navy shadow-xs mt-0.5">
                <SparklesIcon className="size-3.5" />
              </span>
              <div className="space-y-1 text-foreground dark:text-slate-200">
                <p className="font-extrabold text-brand-navy dark:text-amber-300">
                  Statistik & Total Poin Bulan Ini
                </p>
                <p className="leading-relaxed opacity-90">
                  Kamu bisa memantau akumulasi seluruh poin yang terkumpul
                  melalui statistik <strong>Total Poin Bulan Ini</strong> di
                  halaman jurnal, sedangkan performa harian kini ditampilkan
                  sebagai persentase ketuntasan (100% = 100 poin/hari).
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer with web style button */}
        <div className="flex items-center justify-between border-t-2 border-border/70 bg-secondary/30 px-6 py-4 dark:border-border dark:bg-secondary/15">
          <p className="text-xs text-muted-foreground hidden sm:block">
            Semoga harimu semakin produktif dan konsisten! ✨
          </p>
          <div className="flex w-full sm:w-auto items-center justify-end gap-2.5">
            <Button
              variant={isGreen ? 'default' : 'special'}
              size="lg"
              pointer
              onClick={onClose}
              className={cn(
                'w-full sm:w-auto h-11 px-8 rounded-2xl text-sm font-extrabold tracking-wide uppercase',
                isGreen &&
                  'bg-emerald-600 text-white border-transparent hover:bg-emerald-700 [--duo-shade:#047857]',
              )}
            >
              <CheckIcon className="size-4" />
              Mengerti
            </Button>
          </div>
        </div>
      </m.div>
    </div>
  );
}
