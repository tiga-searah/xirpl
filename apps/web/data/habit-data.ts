import type { CheckinsModel } from '@be/modules/checkins/model';
import type { JournalModel } from '@be/modules/journal/model';
import type { LeaderboardModel } from '@be/modules/leaderboard/model';
import {
  computeCheckinScore,
  computeDayScore,
  computePrayScore,
  computeSportScore,
  computeStudyScore,
  MODULE_UI_MAX,
} from '@xirpl/shared';
export {
  computeCheckinScore,
  computeDayScore,
  computePrayScore,
  computeSportScore,
  computeStudyScore,
  MODULE_UI_MAX,
};

export type Journal = JournalModel['Journal'];
export type JournalBody = JournalModel['upsertBody'];

/** The three module answer states: yes, no, unanswered. */
export type Answer = Journal['did_sport'];
export type JournalRecap = JournalModel['recapResponse']['data'];
export type JournalStats = JournalModel['statsResponse']['data'];
export type ModuleAverages = JournalRecap['average_score_each'];
export type DayScore = JournalRecap['scores'][number];

export type Check = CheckinsModel['Check'];
export type CheckinType = CheckinsModel['checkInBody']['type'];
export type CheckinRecap = CheckinsModel['recapResponse']['data'];
export type StreakData = CheckinsModel['streakResponse']['data'];

export type LeaderboardEntry =
  LeaderboardModel['response']['data']['entries'][number];

/** Prayer columns, in display order. `field` points to the journal column on the server. */
export const IBADAH = [
  { label: 'Salat Duha', field: 'prayed_dhuha' },
  { label: 'Salat Tahajud', field: 'prayed_tahajud' },
  { label: 'Salat Qobliyah Subuh', field: 'prayed_qabliyah_fajr' },
  { label: "Salat Ba'diah Isya", field: 'prayed_badiyah_isya' },
] as const satisfies readonly { label: string; field: keyof Journal }[];

/** Columns holding S3 filenames, used to clean up orphaned proofs. */
export const PROOF_FIELDS = [
  'sport_proof_url',
  'study_start_proof_url',
  'study_end_proof_url',
] as const satisfies readonly (keyof Journal)[];

export const SPORT_TYPES = [
  'Lari',
  'Lari Trail',
  'Lari Treadmill',
  'Jalan Kaki',
  'Hiking',
  'Bersepeda',
  'Sepeda Gunung',
  'Sepeda Statis',
  'Renang',
  'Angkat Beban',
  'Latihan Fungsional',
  'Yoga',
  'Pilates',
  'Sepak Bola',
  'Futsal',
  'Basket',
  'Badminton',
  'Tenis',
  'Tenis Meja',
  'Voli',
  'Panjat Dinding',
  'Skateboard',
  'Bela Diri',
  'Lompat Tali',
  'Elliptical',
  'Mesin Rowing',
  'Tangga',
  'Peregangan',
  'Lainnya',
] as const;

export const OPEN_HOUR = 6;
export const LATE_HOUR = 7;

/** Weekend: the attendance module becomes wake-up, deadline 06:00. */
export const WAKE_HOUR = 6;

/** Wake-up after this hour is recorded as afternoon, then as night. */
export const AFTERNOON_HOUR = 15;
export const NIGHT_HOUR = 18;

export const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;

// Public holiday dates (`YYYY-MM-DD`), loaded from GET /calendar/holidays.
let holidays = new Set<string>();
export const setHolidays = (dates: string[]) => {
  holidays = new Set(dates);
};

/** Wake-up day: weekend or national holiday — attendance becomes Bangun Pagi. */
export const isWakeDay = (d: Date) => isWeekend(d) || holidays.has(fmtDate(d));

// Check-in type follows the day: weekends and holidays become wake-up.
export const checkinType = (d: Date): CheckinType =>
  isWakeDay(d) ? 'morning' : 'school';

/** Late limit per type; the server uses the same numbers. */
export const LATE_HOURS: Record<CheckinType, number> = {
  school: LATE_HOUR,
  morning: WAKE_HOUR,
};

// Check-in time as a Date, null when the day isn't recorded yet.
export const checkinAt = (c: Check | null) =>
  c?.checked_in_at ? new Date(c.checked_in_at) : null;

// Check-in past its type's hour limit — the basis of the late label.
export function isLateCheck(c: Check | null) {
  const at = checkinAt(c);
  return !!at && !!c && at.getHours() >= LATE_HOURS[c.type ?? checkinType(at)];
}

/**
 * The streak is computed on the frontend from the check-in status the API returns.
 * A late check-in still counts as present, but always kills the displayed streak.
 */
export const streakForCheckStatus = (
  streak: StreakData | null,
  checks: Check[],
  today = new Date(),
): StreakData | null => {
  const todayDate = fmtDate(today);
  const byDate = new Map(checks.map((check) => [check.date, check]));
  const onTime = (check: Check | undefined) =>
    !!check?.checked_in_at && !isLateCheck(check);
  const isPastWakeDay = (date: string) => {
    const day = toLocalDate(date);
    return (
      isWakeDay(day) && (date < todayDate || today.getHours() >= WAKE_HOUR)
    );
  };

  // Late on any day, or a wake-up day without Wake-Up, breaks the streak.
  // Today only counts as failed once it's past 06:00.
  const lastBreak = checks
    .filter((check) => check.date <= todayDate)
    .filter(
      (check) =>
        isLateCheck(check) || (isPastWakeDay(check.date) && !onTime(check)),
    )
    .map((check) => check.date)
    .sort()
    .at(-1);

  if (!lastBreak) return streak;

  const lastOnTime = checks
    .filter((check) => check.date > lastBreak && onTime(check))
    .map((check) => check.date)
    .sort()
    .at(-1);
  if (!lastOnTime) return { streak: 0, since: null };

  let count = 0;
  let cursor = toLocalDate(lastOnTime);
  while (onTime(byDate.get(fmtDate(cursor)))) {
    count++;
    cursor = new Date(
      cursor.getFullYear(),
      cursor.getMonth(),
      cursor.getDate() - 1,
    );
  }
  return { streak: count, since: lastOnTime };
};

export type AttendanceWindow = 'closed' | 'open' | 'late';

// Current attendance window status, used to lock the button.
export const attendanceWindow = (d: Date): AttendanceWindow =>
  isWakeDay(d)
    ? d.getHours() < WAKE_HOUR
      ? 'open'
      : 'late'
    : d.getHours() < OPEN_HOUR
      ? 'closed'
      : d.getHours() < LATE_HOUR
        ? 'open'
        : 'late';

/**
 * Label for a record past its deadline, computed from the check-in time.
 * Wake-up tiers: late, then afternoon (15:00), then night (18:00).
 */
export const lateLabel = (at: Date) =>
  !isWakeDay(at)
    ? 'Terlambat'
    : at.getHours() >= NIGHT_HOUR
      ? 'Kemalaman'
      : at.getHours() >= AFTERNOON_HOUR
        ? 'Kesorean'
        : 'Kesiangan';

// Single source of text for the journal, stats, and admin dashboard.
export function attendanceCopy(d: Date) {
  const w = isWakeDay(d);
  return {
    title: w ? 'Bangun Pagi' : 'Kehadiran',
    noun: w ? 'bangun pagi' : 'kehadiran',
    action: w ? 'Bangun Pagi' : 'Hadir',
    doneAction: w ? 'Sudah Dicatat' : 'Sudah Absen',
    ok: w ? 'Bangun Pagi' : 'Hadir',
    late: w ? 'Kesiangan' : 'Terlambat',
    deadline: w ? '06:00' : '07:00',
    verb: w ? 'Catat bangun pagi' : 'Absen',
  };
}

/** `api` maps each UI module to the average name the server uses. */
export const MODULES = [
  {
    key: 'ibadah',
    label: 'Ibadah',
    api: 'prays',
    max: 20,
    dot: 'bg-violet-500',
    text: 'text-violet-500',
  },
  {
    key: 'hadir',
    label: 'Kehadiran',
    api: 'checkins',
    max: 30,
    dot: 'bg-sky-500',
    text: 'text-sky-500',
  },
  {
    key: 'olahraga',
    label: 'Olahraga',
    api: 'sports',
    max: 25,
    dot: 'bg-emerald-500',
    text: 'text-emerald-500',
  },
  {
    key: 'belajar',
    label: 'Belajar',
    api: 'studies',
    max: 25,
    dot: 'bg-amber-500',
    text: 'text-amber-500',
  },
] as const satisfies readonly {
  key: string;
  label: string;
  api: keyof ModuleAverages;
  max: number;
  dot: string;
  text: string;
}[];

export type ModuleKey = (typeof MODULES)[number]['key'];

/** Monday first, matching the calendar grid. Full names so keys are unique. */
export const WEEKDAYS = [
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
  'Minggu',
] as const;

export const MONTHS = Array.from({ length: 12 }, (_, i) =>
  new Date(2000, i, 1).toLocaleDateString('id-ID', { month: 'long' }),
);

/** 0 done .. 4 done. Soft emerald ramp, commit-graph style. */
export const HEAT_BG = [
  'bg-slate-100 dark:bg-slate-800/60',
  'bg-emerald-100 dark:bg-emerald-950',
  'bg-emerald-200 dark:bg-emerald-900',
  'bg-emerald-300 dark:bg-emerald-700',
  'bg-emerald-400 dark:bg-emerald-500',
];

export const HEAT_TEXT = [
  'text-slate-400 dark:text-slate-500',
  'text-emerald-900 dark:text-emerald-200',
  'text-emerald-900 dark:text-emerald-100',
  'text-emerald-950 dark:text-white',
  'text-emerald-950 dark:text-white',
];

export const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/** Empty journal: every column `null`, same as an unfilled row. */
export const emptyJournal = (): Journal => ({
  prayed_dhuha: null,
  prayed_tahajud: null,
  prayed_qabliyah_fajr: null,
  prayed_badiyah_isya: null,

  did_sport: null,
  sport_type: null,
  sport_duration: null,
  sport_proof_url: null,
  sport_skip_reason: null,

  did_study: null,
  study_about: null,
  study_media: null,
  study_start_proof_url: null,
  study_end_proof_url: null,
  study_skip_reason: null,
});

const pad = (n: number) => String(n).padStart(2, '0');

/** `YYYY-MM-DD`, the format every endpoint expects and returns. */
export const fmtDate = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** `YYYY-MM`, the format of each `month` query. */
export const fmtMonth = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

export function parseDate(s?: string | null): Date | null {
  const m = s?.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) return null;
  const [, y, mo, d] = m;
  const dt = new Date(Number(y), Number(mo) - 1, Number(d));
  return dt.getMonth() === Number(mo) - 1 && dt.getDate() === Number(d)
    ? dt
    : null;
}

export const fmtTime = (at: Date | string) =>
  `${new Date(at).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })} WIB`;

// `YYYY-MM-DD` from the server into a local Date at midnight.
export const toLocalDate = (date: string) => new Date(`${date}T00:00:00`);

// Get the day of month (1..31) from `YYYY-MM-DD`.
export const dayOf = (date: string) => Number(date.slice(8, 10));

/**
 * Module done, mirroring `moduleDone` on the server: proof is required, reason
 * alone doesn't raise the score.
 */
export const moduleStatus = (j: Journal | null, c: Check | null) => ({
  ibadah: computePrayScore(j) === 20,
  hadir: computeCheckinScore(c) > 0,
  olahraga: computeSportScore(j) === 25,
  belajar: computeStudyScore(j) === 25,
});

export const level = (j: Journal | null, c: Check | null) =>
  Object.values(moduleStatus(j, c)).filter(Boolean).length;

/** Server score 0..100 into a 0..4 module level, the unit the heatmap uses. */
export const scoreLevel = (score: number) => {
  if (score <= 0) return 0;
  if (score < 40) return 1;
  if (score < 60) return 2;
  if (score < 80) return 3;
  return 4;
};

// Map `scores` from the recap into a date -> level map for the calendar grid.
export function levelsByDay(scores: DayScore[]) {
  const out = new Map<number, number>();
  for (const s of scores) out.set(dayOf(s.date), scoreLevel(s.score));
  return out;
}

// Turn `scores` into a daily chart series.
export const dailySeries = (scores: DayScore[]) =>
  scores.map((s) => ({ day: dayOf(s.date), value: s.score }));

export const averageScore = (scores: DayScore[]) =>
  scores.length
    ? Math.round(scores.reduce((a, s) => a + s.score, 0) / scores.length)
    : 0;

export const totalScore = (scores: DayScore[]) =>
  scores.reduce((a, s) => a + s.score, 0);

// Map each module average from its server name to the key the UI uses.
export const moduleStats = (
  avg: ModuleAverages,
): Record<ModuleKey, number> => ({
  ibadah: avg.prays,
  hadir: avg.checkins,
  olahraga: avg.sports,
  belajar: avg.studies,
});

export const EMPTY_MODULE_AVERAGES: ModuleAverages = {
  checkins: 0,
  prays: 0,
  sports: 0,
  studies: 0,
};

const blank = (s: string) => (s.trim() ? s.trim() : null);

/** Trim text input before sending; empty strings are stored as `null`. */
export const toJournalBody = (j: Journal, date?: string): JournalBody => ({
  ...j,
  ...(date ? { date } : {}),
  sport_type: j.sport_type && blank(j.sport_type),
  sport_skip_reason: j.sport_skip_reason && blank(j.sport_skip_reason),
  study_about: j.study_about && blank(j.study_about),
  study_media: j.study_media && blank(j.study_media),
  study_skip_reason: j.study_skip_reason && blank(j.study_skip_reason),
});
