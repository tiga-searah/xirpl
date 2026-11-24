import { toDateStr, wibHour } from '@be/lib/utils';
import { checkinsTable, db, habitJournalsTable } from '@xirpl/db';
import {
  computeDayScore,
  getEditableJournalDates,
  MODULE_MAX,
} from '@xirpl/shared';
import { and, between, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { User } from '../user/service';
import type { JournalModel } from './model';

type JournalRow = typeof habitJournalsTable.$inferSelect;
type CheckinRow = typeof checkinsTable.$inferSelect;

const DAY_MS = 86_400_000;
const RETRO = 180; // streak window in days

/** Journal modules, in the order the dashboard and the PDF list them. */
const MODULE_KEYS = ['checkins', 'prays', 'sports', 'studies'] as const;

/** PDF score buckets (the dashboard's four buckets split into five). */
const SCORE_BUCKETS = [
  { min: 0, max: 20 },
  { min: 21, max: 40 },
  { min: 41, max: 60 },
  { min: 61, max: 80 },
  { min: 81, max: 100 },
] as const;

/** `YYYY-MM` -> `Agustus 2026`. */
const monthLabel = (month: string) => {
  const [y = 0, m = 0] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
  });
};

/** Late if check-in minute in WIB is at/after this, per type: 07:01 / 06:01. */
const LATE_MINUTES: Record<'school' | 'morning', number> = {
  school: 7 * 60 + 1,
  morning: 6 * 60 + 1,
};
const isLate = (at: Date | null, type: 'school' | 'morning') =>
  !!at && wibHour(at) * 60 + at.getUTCMinutes() >= LATE_MINUTES[type];

/** `YYYY-MM` -> inclusive `{ first, last }` bounds of that month. */
const monthBounds = (month: string) => {
  const [y = 0, m = 0] = month.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return {
    first: `${month}-01`,
    last: `${month}-${String(last).padStart(2, '0')}`,
  };
};

/** Days of `month` that have already happened (today inclusive). */
const elapsedDays = (month: string) => {
  const today = toDateStr();
  if (month > today.slice(0, 7)) return 0;
  const [y = 0, m = 0] = month.split('-').map(Number);
  const full = new Date(y, m, 0).getDate();
  return month === today.slice(0, 7)
    ? Math.min(full, Number(today.slice(8, 10)))
    : full;
};

/**
 * One student's month totals: per-day score (0-100), module counts, perfect
 * days and late check-ins.
 */
const monthlySummary = (
  month: string,
  journals: Map<string, JournalRow>,
  checkins: Map<string, CheckinRow>,
) => {
  const cap = elapsedDays(month);
  const days: { date: string; score: number }[] = [];
  const counts = { checkins: 0, prays: 0, sports: 0, studies: 0 };
  const moduleDays = {
    checkins: [] as { day: number; ratio: number }[],
    prays: [] as { day: number; ratio: number }[],
    sports: [] as { day: number; ratio: number }[],
    studies: [] as { day: number; ratio: number }[],
  };
  let perfect = 0;
  let late = 0;
  let checkinCount = 0;
  let sum = 0;
  for (let d = 1; d <= cap; d++) {
    const date = `${month}-${String(d).padStart(2, '0')}`;
    const j = journals.get(date);
    const c = checkins.get(date);
    const s = computeDayScore(j, c);
    const score = s.total;

    for (const k of MODULE_KEYS) {
      counts[k] += s[k];
      if (s[k] > 0) {
        moduleDays[k].push({
          day: d,
          ratio: Math.round((s[k] / MODULE_MAX[k]) * 100) / 100,
        });
      }
    }
    sum += score;
    if (score === 100) perfect++;
    if (c?.checked_in_at) {
      checkinCount++;
      if (isLate(c.checked_in_at, c.type)) late++;
    }
    days.push({ date, score });
  }
  const n = cap || 1;
  return {
    days,
    score: cap ? Math.round(sum / n) : 0,
    total_score: sum,
    counts,
    moduleDays,
    perfect,
    late,
    checkinCount,
    avg: (v: number) => Math.round(v / n),
    pct: (v: number) => Math.round((v / n) * 100),
  };
};

/** Streak: consecutive on-time days ending today; done[0] = today. */
const streakFrom = (done: boolean[]) => {
  let run = 0;
  for (let i = done[0] ? 0 : 1; i < done.length && done[i]; i++) run++;
  return run;
};

/** Postgres interval `HH:MM:SS` (or `HH:MM:SS.fff`) -> minutes. */
const intervalToMinutes = (v: string | null) => {
  if (!v) return null;
  const [h = 0, m = 0] = v.split(':').map(Number);
  return Math.round(h * 60 + m);
};

/** Row -> response `Journal` shape; interval arrives as minutes. */
const toJournal = (row: JournalRow) => ({
  prayed_dhuha: row.prayed_dhuha,
  prayed_tahajud: row.prayed_tahajud,
  prayed_qabliyah_fajr: row.prayed_qabliyah_fajr,
  prayed_badiyah_isya: row.prayed_badiyah_isya,

  did_sport: row.did_sport,
  sport_type: row.sport_type,
  sport_duration: intervalToMinutes(row.sport_duration),
  sport_proof_url: row.sport_proof_url,
  sport_skip_reason: row.sport_skip_reason,

  did_study: row.did_study,
  study_about: row.study_about,
  study_media: row.study_media,
  study_start_proof_url: row.study_start_proof_url,
  study_end_proof_url: row.study_end_proof_url,
  study_skip_reason: row.study_skip_reason,
});

export const Journal = {
  /**
   * Create or update today's journal. Only provided fields are written, so a
   * partial body never wipes existing data.
   */
  async upsert(userId: string, body: JournalModel['upsertBody']) {
    const { sport_duration, date: requestedDate, ...rest } = body;
    const targetDate = requestedDate ?? toDateStr();
    const editableDates = getEditableJournalDates(new Date());
    if (!editableDates.includes(targetDate)) {
      return { ok: false as const, reason: 'locked' as const };
    }

    const values = {
      user_id: userId,
      date: targetDate,
      ...rest,
      ...(sport_duration !== undefined && {
        sport_duration:
          sport_duration === null
            ? null
            : sql`make_interval(mins => ${sport_duration})`,
      }),
    };
    const { user_id, date, ...set } = values;
    await db
      .insert(habitJournalsTable)
      .values(values)
      .onConflictDoUpdate({
        target: [habitJournalsTable.user_id, habitJournalsTable.date],
        set,
      });
    return { ok: true as const };
  },

  /** Get journal for a date, or null. */
  async getByDate(userId: string, date: string) {
    const [row] = await db
      .select()
      .from(habitJournalsTable)
      .where(
        and(
          eq(habitJournalsTable.user_id, userId),
          eq(habitJournalsTable.date, date),
        ),
      )
      .limit(1);
    return row ? toJournal(row) : null;
  },

  /**
   * Monthly recap: every elapsed day of the month with per-module completion
   * (0/1), day average (0..100), month rate (% perfect days) and module rates.
   */
  async getRecap(userId: string, month: string) {
    const { first, last } = monthBounds(month);
    const [rows, checks] = await Promise.all([
      db
        .select()
        .from(habitJournalsTable)
        .where(
          and(
            eq(habitJournalsTable.user_id, userId),
            between(habitJournalsTable.date, first, last),
          ),
        ),
      db
        .select({
          date: checkinsTable.date,
          checked_in_at: checkinsTable.checked_in_at,
          type: checkinsTable.type,
        })
        .from(checkinsTable)
        .where(
          and(
            eq(checkinsTable.user_id, userId),
            between(checkinsTable.date, first, last),
          ),
        ),
    ]);

    const journalByDate = new Map(rows.map((r) => [r.date, r]));
    const checkinByDate = new Map(checks.map((c) => [c.date, c]));

    const scores: { date: string; score: number }[] = [];
    const moduleTotals = { checkins: 0, prays: 0, sports: 0, studies: 0 };
    for (let d = 1; d <= elapsedDays(month); d++) {
      const date = `${month}-${String(d).padStart(2, '0')}`;
      const j = journalByDate.get(date);
      const c = checkinByDate.get(date);
      const s = computeDayScore(j, c);
      scores.push({
        date,
        score: s.total,
      });
      moduleTotals.checkins += s.checkins;
      moduleTotals.prays += s.prays;
      moduleTotals.sports += s.sports;
      moduleTotals.studies += s.studies;
    }

    const n = scores.length || 1;
    const totalScore = scores.reduce((a, s) => a + s.score, 0);

    return {
      month,
      rate: Math.round(
        (scores.filter((s) => s.score === 100).length / n) * 100,
      ),
      average_score: Math.round(totalScore / n),
      total_score: totalScore,
      average_score_each: {
        checkins: Math.round(moduleTotals.checkins / n),
        prays: Math.round(moduleTotals.prays / n),
        sports: Math.round(moduleTotals.sports / n),
        studies: Math.round(moduleTotals.studies / n),
      },
      total_score_each: moduleTotals,
      elapsed_days: elapsedDays(month),
      scores,
    };
  },

  /**
   * Class-wide monthly stats: per-day class average scores, per-module
   * averages, score distribution, perfect days, streaks, late and attention.
   */
  async getStats(month: string) {
    const students = await User.getStudents();
    const ids = students.map((s) => s.id);
    const { first, last } = monthBounds(month);
    const retroStart = toDateStr(
      new Date(
        new Date(`${toDateStr()}T00:00:00`).getTime() - (RETRO - 1) * DAY_MS,
      ),
    );

    const [jrows, crows, hrows] = await Promise.all([
      ids.length
        ? db
            .select()
            .from(habitJournalsTable)
            .where(
              and(
                inArray(habitJournalsTable.user_id, ids),
                between(habitJournalsTable.date, first, last),
              ),
            )
        : [],
      ids.length
        ? db
            .select()
            .from(checkinsTable)
            .where(
              and(
                inArray(checkinsTable.user_id, ids),
                between(checkinsTable.date, first, last),
              ),
            )
        : [],
      ids.length
        ? db
            .select()
            .from(checkinsTable)
            .where(
              and(
                inArray(checkinsTable.user_id, ids),
                gte(checkinsTable.date, retroStart),
                lte(checkinsTable.date, last),
              ),
            )
        : [],
    ]);

    const jByUser = new Map<string, Map<string, JournalRow>>();
    for (const r of jrows) {
      if (!jByUser.has(r.user_id)) jByUser.set(r.user_id, new Map());
      jByUser.get(r.user_id)!.set(r.date, r);
    }
    const cByUser = new Map<string, Map<string, CheckinRow>>();
    for (const r of crows) {
      if (!cByUser.has(r.user_id)) cByUser.set(r.user_id, new Map());
      cByUser.get(r.user_id)!.set(r.date, r);
    }
    const onTime = new Map<string, Set<string>>();
    for (const r of hrows) {
      if (isLate(r.checked_in_at, r.type)) continue;
      if (!onTime.has(r.user_id)) onTime.set(r.user_id, new Set());
      onTime.get(r.user_id)!.add(r.date);
    }

    const todayMs = new Date(`${toDateStr()}T00:00:00`).getTime();
    const stats = students.map((s) => {
      const m = monthlySummary(
        month,
        jByUser.get(s.id) ?? new Map(),
        cByUser.get(s.id) ?? new Map(),
      );
      const done: boolean[] = [];
      const set = onTime.get(s.id) ?? new Set();
      for (let i = 0; i < RETRO; i++)
        done.push(set.has(toDateStr(new Date(todayMs - i * DAY_MS))));
      return { ...m, streak: streakFrom(done) };
    });

    const n = stats.length || 1;
    const mean = (f: (s: (typeof stats)[number]) => number) =>
      Math.round(stats.reduce((a, s) => a + f(s), 0) / n);
    const count = (f: (s: (typeof stats)[number]) => number) =>
      stats.reduce((a, s) => a + f(s), 0);

    const distribution = {
      '0-20': 0,
      '21-40': 0,
      '41-60': 0,
      '61-80': 0,
      '81-100': 0,
    };
    for (const s of stats) {
      const k =
        s.score <= 20
          ? '0-20'
          : s.score <= 40
            ? '21-40'
            : s.score <= 60
              ? '41-60'
              : s.score <= 80
                ? '61-80'
                : '81-100';
      distribution[k]++;
    }

    const scores = Array.from({ length: elapsedDays(month) }, (_, i) => {
      const date = `${month}-${String(i + 1).padStart(2, '0')}`;
      const sum = stats.reduce(
        (a, s) => a + (s.days.find((d) => d.date === date)?.score ?? 0),
        0,
      );
      return { date, score: Math.round(sum / n) };
    });

    const classTotals = { checkins: 0, prays: 0, sports: 0, studies: 0 };
    for (const s of stats) {
      for (const k of MODULE_KEYS) classTotals[k] += s.counts[k];
    }

    return {
      month,
      average_score: mean((s) => s.score),
      total_score: mean((s) => s.total_score),
      average_score_each: {
        checkins: mean((s) => s.avg(s.counts.checkins)),
        prays: mean((s) => s.avg(s.counts.prays)),
        sports: mean((s) => s.avg(s.counts.sports)),
        studies: mean((s) => s.avg(s.counts.studies)),
      },
      total_score_each: classTotals,
      student_count: stats.length,
      elapsed_days: elapsedDays(month),
      scores,
      score_distribution: distribution,
      completed_days: count((s) => s.perfect),
      students_on_streaks: stats.filter((s) => s.streak >= 3).length,
      late_count: count((s) => s.late),
      need_attention_count: stats.filter((s) => s.score < 50).length,
    };
  },

  /** Per-student monthly score summary for a list of student ids. */
  async getStudentRecap(studentIds: string[], month: string) {
    const { first, last } = monthBounds(month);
    const [jrows, crows] = await Promise.all([
      studentIds.length
        ? db
            .select()
            .from(habitJournalsTable)
            .where(
              and(
                inArray(habitJournalsTable.user_id, studentIds),
                between(habitJournalsTable.date, first, last),
              ),
            )
        : [],
      studentIds.length
        ? db
            .select()
            .from(checkinsTable)
            .where(
              and(
                inArray(checkinsTable.user_id, studentIds),
                between(checkinsTable.date, first, last),
              ),
            )
        : [],
    ]);
    const jByUser = new Map<string, Map<string, JournalRow>>();
    for (const r of jrows) {
      if (!jByUser.has(r.user_id)) jByUser.set(r.user_id, new Map());
      jByUser.get(r.user_id)!.set(r.date, r);
    }
    const cByUser = new Map<string, Map<string, CheckinRow>>();
    for (const r of crows) {
      if (!cByUser.has(r.user_id)) cByUser.set(r.user_id, new Map());
      cByUser.get(r.user_id)!.set(r.date, r);
    }

    const students = studentIds.map((id) => {
      const m = monthlySummary(
        month,
        jByUser.get(id) ?? new Map(),
        cByUser.get(id) ?? new Map(),
      );
      return {
        user_id: id,
        average_score: m.score,
        total_score: m.total_score,
        average_score_each: {
          checkins: m.avg(m.counts.checkins),
          prays: m.avg(m.counts.prays),
          sports: m.avg(m.counts.sports),
          studies: m.avg(m.counts.studies),
        },
        total_score_each: m.counts,
      };
    });

    return { month, elapsed_days: elapsedDays(month), students };
  },

  /**
   * Everything the recap PDF needs, in one pass: class overview, per-day class
   * average, module share, score buckets and a per-student breakdown with the
   * days each module was completed.
   *
   * Reuses the same rate/streak/late/score rules as `getStats`, so the PDF can
   * never drift from the dashboard.
   */
  async getMonthlyRecap(month: string) {
    const students = await User.getStudents();
    const ids = students.map((s) => s.id);
    const { first, last } = monthBounds(month);
    const retroStart = toDateStr(
      new Date(
        new Date(`${toDateStr()}T00:00:00`).getTime() - (RETRO - 1) * DAY_MS,
      ),
    );

    const [jrows, crows, hrows] = await Promise.all([
      ids.length
        ? db
            .select()
            .from(habitJournalsTable)
            .where(
              and(
                inArray(habitJournalsTable.user_id, ids),
                between(habitJournalsTable.date, first, last),
              ),
            )
        : [],
      ids.length
        ? db
            .select()
            .from(checkinsTable)
            .where(
              and(
                inArray(checkinsTable.user_id, ids),
                between(checkinsTable.date, first, last),
              ),
            )
        : [],
      ids.length
        ? db
            .select()
            .from(checkinsTable)
            .where(
              and(
                inArray(checkinsTable.user_id, ids),
                gte(checkinsTable.date, retroStart),
                lte(checkinsTable.date, last),
              ),
            )
        : [],
    ]);

    const jByUser = new Map<string, Map<string, JournalRow>>();
    for (const r of jrows) {
      if (!jByUser.has(r.user_id)) jByUser.set(r.user_id, new Map());
      jByUser.get(r.user_id)!.set(r.date, r);
    }
    const cByUser = new Map<string, Map<string, CheckinRow>>();
    for (const r of crows) {
      if (!cByUser.has(r.user_id)) cByUser.set(r.user_id, new Map());
      cByUser.get(r.user_id)!.set(r.date, r);
    }
    const onTime = new Map<string, Set<string>>();
    for (const r of hrows) {
      if (isLate(r.checked_in_at, r.type)) continue;
      if (!onTime.has(r.user_id)) onTime.set(r.user_id, new Set());
      onTime.get(r.user_id)!.add(r.date);
    }

    const todayMs = new Date(`${toDateStr()}T00:00:00`).getTime();
    const rows = students.map((s) => {
      const m = monthlySummary(
        month,
        jByUser.get(s.id) ?? new Map(),
        cByUser.get(s.id) ?? new Map(),
      );
      const set = onTime.get(s.id) ?? new Set();
      const done: boolean[] = [];
      for (let i = 0; i < RETRO; i++)
        done.push(set.has(toDateStr(new Date(todayMs - i * DAY_MS))));
      return { student: s, summary: m, streak: streakFrom(done) };
    });

    const days = elapsedDays(month);
    const n = rows.length || 1;
    /** Class mean of a per-student value. */
    const mean = (f: (r: (typeof rows)[number]) => number) =>
      Math.round(rows.reduce((a, r) => a + f(r), 0) / n);
    const [year = 0, monthNo = 0] = month.split('-').map(Number);

    const totals = { checkins: 0, prays: 0, sports: 0, studies: 0 };
    for (const r of rows)
      for (const k of MODULE_KEYS) totals[k] += r.summary.counts[k];
    const totalDone = MODULE_KEYS.reduce((a, k) => a + totals[k], 0) || 1;

    const buckets: { min: number; max: number; count: number }[] =
      SCORE_BUCKETS.map((b) => ({ ...b, count: 0 }));
    for (const r of rows) {
      const b =
        buckets.find((x) => r.summary.score <= x.max) ?? buckets.at(-1)!;
      b.count++;
    }

    return {
      month: {
        year,
        month: monthNo,
        label: monthLabel(month),
        days: new Date(year, monthNo, 0).getDate(),
        elapsed: days,
      },
      overview: {
        rate: mean((r) => r.summary.score),
        checkins: rows.reduce((a, r) => a + r.summary.checkinCount, 0),
        late: rows.reduce((a, r) => a + r.summary.late, 0),
        needAttention: rows.filter((r) => r.summary.score < 50).length,
      },
      dailyTrend: Array.from({ length: days }, (_, i) => {
        const date = `${month}-${String(i + 1).padStart(2, '0')}`;
        const sum = rows.reduce(
          (a, r) =>
            a + (r.summary.days.find((d) => d.date === date)?.score ?? 0),
          0,
        );
        return { day: i + 1, value: Math.round(sum / n) };
      }),
      modules: MODULE_KEYS.map((key) => ({
        key,
        value: Math.round((totals[key] / totalDone) * 1000) / 10,
      })),
      scoreDistribution: buckets,
      students: rows.map((r) => ({
        id: r.student.id,
        nis: r.student.nis,
        name: r.student.name,
        modules: MODULE_KEYS.map((key) => ({
          key,
          days: r.summary.moduleDays[key],
        })),
        rate: r.summary.score,
        streaks: r.streak,
      })),
    };
  },
};

export type MonthlyJournalRecap = Awaited<
  ReturnType<typeof Journal.getMonthlyRecap>
>;
