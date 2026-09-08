'use client';

import api, { API_URL } from '@fe/lib/api';
import { useUser } from '@fe/hooks/use-user';
import {
  LockIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import { motion as m, useReducedMotion } from 'motion/react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  attendanceCopy,
  attendanceWindow,
  type Check,
  type CheckinRecap,
  checkinAt,
  checkinType,
  emptyJournal,
  fmtDate,
  fmtMonth,
  type Journal,
  type JournalRecap,
  level,
  levelsByDay,
  moduleStatus,
  parseDate,
  PROOF_FIELDS,
  setHolidays,
  type StreakData,
  streakForCheckStatus,
  toJournalBody,
} from '../../../../data/habit-data';
import { JournalFields } from './journal-fields';
import { HabitJournalSkeleton } from './journal-skeleton';
import { HabitCalendar, HabitStats } from './widgets';

const MAX_PHOTO = 5 * 1024 * 1024;
const SAVE_DELAY = 500;

export type UploadProgress = { field: string; sent: number; total: number };

// Upload proof to S3 and return its filename; the server compresses.
// XHR, not fetch: only XHR reports upload.onprogress for the percentage.
function uploadPhoto(file: File, onProgress: (sent: number) => void) {
  if (!file.type.startsWith('image/'))
    return Promise.reject(new Error('File harus berupa gambar.'));
  if (file.size > MAX_PHOTO)
    return Promise.reject(new Error('Ukuran foto maksimal 5MB.'));

  return new Promise<string>((resolve, reject) => {
    const fail = () => reject(new Error('Gagal mengunggah foto. Coba lagi.'));
    const form = new FormData();
    form.append('file', file);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_URL}/s3/upload`);
    xhr.withCredentials = true;
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded);
    xhr.onload = () => {
      // Token expired mid-upload: retry through the eden client, which refreshes.
      if (xhr.status === 401) {
        api.s3.upload
          .post({ file })
          .then(({ data }) => {
            const name = data?.data?.filename;
            if (name) resolve(name);
            else fail();
          })
          .catch(fail);
        return;
      }
      try {
        const name = JSON.parse(xhr.responseText)?.data?.filename;
        if (xhr.status === 201 && name) resolve(name);
        else fail();
      } catch {
        fail();
      }
    };
    xhr.onerror = fail;
    xhr.send(form);
  });
}

// Delete proofs the journal no longer references, so files don't pile up in S3.
function dropProofs(prev: Journal, next: Journal) {
  for (const field of PROOF_FIELDS) {
    const gone = prev[field];
    if (gone && gone !== next[field])
      api
        .s3({ filename: gone })
        .delete()
        .catch(() => {});
  }
}

export default function HabitJournal() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const reduce = useReducedMotion();
  const { user, loading: userLoading } = useUser();

  const [data, setData] = useState<Journal>(emptyJournal);
  const dataRef = useRef(data);
  const [check, setCheck] = useState<Check | null>(null);
  const [recap, setRecap] = useState<JournalRecap | null>(null);
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [streakChecks, setStreakChecks] = useState<Check[]>([]);
  const [month, setMonth] = useState(() => new Date());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<UploadProgress | null>(null);
  const [version, setVersion] = useState(0);
  const [now, setNow] = useState(() => new Date());
  const [journalLoading, setJournalLoading] = useState(true);
  const [holidaysLoading, setHolidaysLoading] = useState(true);

  // Public holidays turn weekdays into Bangun Pagi too; fetch this and last
  // year so the streak window (current + previous month) is covered.
  useEffect(() => {
    const y = new Date().getFullYear();
    Promise.all([
      api.calendar.holidays.get({ query: { year: String(y) } }),
      api.calendar.holidays.get({ query: { year: String(y - 1) } }),
    ])
      .then(([cur, prev]) =>
        setHolidays([
          ...(cur.data?.data ?? []),
          ...(prev.data?.data ?? []),
        ].map((h) => h.date)),
      )
      .catch(() => {}) // offline: weekends still work
      .finally(() => setHolidaysLoading(false));
  }, []);

  const today = useMemo(() => new Date(), []);
  const todayStr = fmtDate(today);
  const date = fmtDate(parseDate(params.get('date')) ?? today);
  const selected = parseDate(date) ?? today;
  const editable = date === todayStr;

  // The journal is a private page. Save the original destination so users return
  // to the date they had open after logging in.
  useEffect(() => {
    if (userLoading || user) return;
    const query = params.toString();
    const destination = query ? `${pathname}?${query}` : pathname;
    router.replace(`/login?r=${encodeURIComponent(destination)}`);
  }, [params, pathname, router, user, userLoading]);

  // Journal and check-in for the selected date; a 404 from the server means an empty day.
  useEffect(() => {
    if (userLoading || !user) return;
    let alive = true;
    setJournalLoading(true);
    setError(null);
    Promise.all([api.journals({ date }).get(), api.checkins({ date }).get()])
      .then(([j, c]) => {
        if (!alive) return;
        const loaded = j.data?.data ?? emptyJournal();
        dataRef.current = loaded;
        setData(loaded);
        setCheck(c.data?.data ?? null);
      })
      .catch(() => {
        if (alive) setError('Gagal memuat catatan. Periksa koneksi kamu.');
      })
      .finally(() => {
        if (alive) setJournalLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [date, user, userLoading]);

  useEffect(() => {
    const d = parseDate(date);
    if (!d) return;
    setMonth((prev) =>
      d.getMonth() !== prev.getMonth() || d.getFullYear() !== prev.getFullYear()
        ? new Date(d.getFullYear(), d.getMonth(), 1)
        : prev,
    );
  }, [date]);

  // Monthly recap and streak; `version` bumps on each successful save to stay fresh.
  useEffect(() => {
    if (userLoading || !user) return;
    let alive = true;
    const todayMonth = fmtMonth(today);
    const previousMonth = fmtMonth(
      new Date(today.getFullYear(), today.getMonth() - 1, 1),
    );
    Promise.all([
      api.journals.recap.get({ query: { month: fmtMonth(month) } }),
      api.checkins.streak.get(),
      api.checkins.recap.get({ query: { month: todayMonth } }),
      api.checkins.recap.get({ query: { month: previousMonth } }),
    ])
      .then(([r, s, currentChecks, previousChecks]) => {
        if (!alive) return;
        setRecap(r.data?.data ?? null);
        setStreak(s.data?.data ?? null);
        setStreakChecks([
          ...((previousChecks.data?.data as CheckinRecap | undefined)?.recap ??
            []),
          ...((currentChecks.data?.data as CheckinRecap | undefined)?.recap ??
            []),
        ]);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [month, today, user, userLoading, version]);

  const levels = useMemo(() => {
    const map = levelsByDay(recap?.scores ?? []);
    if (
      selected.getMonth() === month.getMonth() &&
      selected.getFullYear() === month.getFullYear()
    )
      map.set(selected.getDate(), level(data, check));
    return map;
  }, [recap, selected, month, data, check]);

  const setDate = (d: Date) =>
    router.replace(`${pathname}?date=${fmtDate(d)}`, { scroll: false });

  const gate = attendanceWindow(now);
  const copy = attendanceCopy(selected);
  const checkedAt = checkinAt(check);
  const waitingForOpen = editable && !checkedAt && gate === 'closed';
  useEffect(() => {
    if (!waitingForOpen) return;
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, [waitingForOpen]);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    },
    [],
  );

  // Update state, then send the whole day's journal — debounced so typing
  // doesn't fire a request per keystroke.
  const update = useCallback((fn: (prev: Journal) => Journal) => {
    const prev = dataRef.current;
    const next = fn(prev);
    dataRef.current = next;
    setData(next);
    dropProofs(prev, next);

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      api.journals
        .put(toJournalBody(next))
        .then(({ error: failed }) => {
          setError(failed ? 'Gagal menyimpan ke server. Coba lagi.' : null);
          if (!failed) setVersion((v) => v + 1);
        })
        .catch(() => setError('Gagal menyimpan ke server. Coba lagi.'));
    }, SAVE_DELAY);
  }, []);

  const pickPhoto = async (
    file: File | undefined,
    field: string,
    apply: (prev: Journal, filename: string) => Journal,
  ) => {
    if (!file) return;
    setBusy(true);
    setUploading({ field, sent: 0, total: file.size });
    try {
      const filename = await uploadPhoto(file, (sent) =>
        setUploading({ field, sent, total: file.size }),
      );
      update((prev) => apply(prev, filename));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      setUploading(null);
    }
  };

  // Check in today via the check-in endpoint, not through the journal.
  const checkIn = async () => {
    const clicked = new Date();
    if (attendanceWindow(clicked) === 'closed') {
      setNow(clicked);
      setError('Absensi baru dibuka pukul 06:00.');
      return;
    }

    const type = checkinType(clicked);
    setBusy(true);
    const { error: failed } = await api.checkins['check-in'].post({ type });
    setBusy(false);
    if (failed) {
      setError('Gagal mencatat kehadiran. Coba lagi.');
      return;
    }

    setError(null);
    setCheck({
      date,
      is_checked: true,
      type,
      checked_in_at: clicked,
      checked_out_at: null,
    });
    setVersion((v) => v + 1);
  };

  const status = moduleStatus(data, check);
  const visibleStreak = streakForCheckStatus(streak, streakChecks, today);

  if (userLoading || !user || journalLoading || holidaysLoading)
    return <HabitJournalSkeleton />;

  return (
    <div className="bg-background min-h-screen transition-colors duration-300">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <m.header
          initial={reduce ? false : { opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-10"
        >
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl dark:text-white">
            Jurnal Kebiasaan
          </h1>
          <p className="mt-1.5 text-base text-muted-foreground">
            {selected.toLocaleDateString('id-ID', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
            {!editable && ' · hanya bisa dibaca'}
          </p>
        </m.header>

        <div className="grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-[1fr_360px]">
          <div>
            {error && (
              <p
                role="alert"
                className="mb-6 flex items-start gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
              >
                <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
                {error}
              </p>
            )}

            {!editable && (
              <p className="mb-6 flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                <LockIcon className="size-4 shrink-0" />
                Catatan tanggal ini terkunci.
                <button
                  type="button"
                  onClick={() => setDate(today)}
                  className="ml-auto cursor-pointer font-semibold underline underline-offset-2"
                >
                  Ke hari ini
                </button>
              </p>
            )}

            <JournalFields
              data={data}
              editable={editable}
              busy={busy}
              uploading={uploading}
              reduce={reduce}
              selected={selected}
              now={now}
              check={check}
              status={status}
              update={update}
              pickPhoto={pickPhoto}
              checkIn={checkIn}
            />
          </div>

          <aside className="space-y-8 lg:sticky lg:top-20 lg:self-start">
            <HabitCalendar
              selected={selected}
              month={month}
              levels={levels}
              onSelect={setDate}
              onMonthChange={setMonth}
            />
            <HabitStats
              month={month}
              recap={recap}
              streak={visibleStreak}
              onMonthChange={setMonth}
            />
          </aside>
        </div>
      </div>
    </div>
  );
}

