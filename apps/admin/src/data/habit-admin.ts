import type { CheckinsModel } from '@be/modules/checkins/model';
import type { JournalModel } from '@be/modules/journal/model';
import type { UserModel } from '@be/modules/user/model';

type Student = UserModel['Student'];

import api, { API_URL } from '../lib/api';
import {
  type Check,
  dailySeries,
  EMPTY_MODULE_AVERAGES,
  fmtMonth,
  type Journal,
  levelsByDay,
  type ModuleKey,
  moduleStats,
  totalScore,
} from './habit-data';

export type Member = Student;
export type AdminRole = Extract<
  Member['role'],
  'developer' | 'teacher' | 'homeroom_teacher' | 'leader' | 'vice_leader'
>;

/** Same as `ADMIN_ROLES` on the server; decides dashboard menu access. */
export const ADMIN_ROLES = [
  'developer',
  'teacher',
  'homeroom_teacher',
  'leader',
  'vice_leader',
] as const satisfies readonly AdminRole[];

export const isAdminRole = (role?: string | null): role is AdminRole =>
  !!role && (ADMIN_ROLES as readonly string[]).includes(role);

/** Recharts paints SVG, so the module palette needs literal colors, not classes. */
export const MODULE_HEX: Record<ModuleKey, string> = {
  ibadah: '#8b5cf6',
  hadir: '#0ea5e9',
  olahraga: '#10b981',
  belajar: '#f59e0b',
};

type ScoreBucket =
  keyof JournalModel['statsResponse']['data']['score_distribution'];

/** Fixed order, so the distribution bars don't follow the server's key order. */
const BUCKETS = [
  '0-20',
  '21-40',
  '41-60',
  '61-80',
  '81-100',
] as const satisfies readonly ScoreBucket[];

const BUCKET_LABEL: Record<ScoreBucket, string> = {
  '0-20': '0–20',
  '21-40': '21–40',
  '41-60': '41–60',
  '61-80': '61–80',
  '81-100': '81–100',
};

// Every member counts as a student, used as dashboard table rows.
export async function fetchMembers(): Promise<Member[]> {
  const { data } = await api.users.students.get();
  return data?.data ?? [];
}

/** Downloads the class recap PDF from GET /journals/pdf for the given month. */
export async function downloadRecapPdf(month: Date) {
  const res = await fetch(`${API_URL}/journals/pdf?month=${fmtMonth(month)}`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`PDF export failed (${res.status})`);
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `journal-recap-${fmtMonth(month)}.pdf`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Class recap: summary cards, daily trend, score distribution. */
export async function fetchClassSummary(month: Date) {
  const { data } = await api.journals.stats.get({
    query: { month: fmtMonth(month) },
  });
  const stats = data?.data;

  return {
    score: stats?.average_score ?? 0,
    totalScore: stats?.total_score ?? 0,
    modules: moduleStats(stats?.average_score_each ?? EMPTY_MODULE_AVERAGES),
    moduleTotals: moduleStats(stats?.total_score_each ?? EMPTY_MODULE_AVERAGES),
    studentCount: stats?.student_count ?? 0,
    elapsedDays: stats?.elapsed_days ?? stats?.scores?.length ?? 1,
    perfect: stats?.completed_days ?? 0,
    streaking: stats?.students_on_streaks ?? 0,
    late: stats?.late_count ?? 0,
    atRisk: stats?.need_attention_count ?? 0,
    trend: dailySeries(stats?.scores ?? []),
    buckets: BUCKETS.map((b) => ({
      range: BUCKET_LABEL[b],
      count: stats?.score_distribution[b] ?? 0,
    })),
  };
}

export type ClassSummary = Awaited<ReturnType<typeof fetchClassSummary>>;

export type MemberRow = {
  member: Member;
  score: number;
  totalScore: number;
  modules: Record<ModuleKey, number>;
  moduleTotals?: Record<ModuleKey, number>;
  late: number;
  absent: number;
  present: number;
};

/**
 * One row per member. Two endpoints at once: module scores from the journal, late
 * and absent from check-ins.
 */
export async function fetchMemberRows(
  members: Member[],
  month: Date,
): Promise<MemberRow[]> {
  const query = { month: fmtMonth(month) };
  const [journals, checkins] = await Promise.all([
    api.journals.students.get({ query }),
    api.checkins.students.get({ query }),
  ]);

  type JournalStudent =
    JournalModel['studentsResponse']['data']['students'][number];
  type CheckStudent =
    CheckinsModel['studentsResponse']['data']['students'][number];

  const scores = new Map<string, JournalStudent>(
    (journals.data?.data.students ?? []).map((s) => [s.user_id, s]),
  );
  const checks = new Map<string, CheckStudent>(
    (checkins.data?.data.students ?? []).map((s) => [s.user_id, s]),
  );
  const elapsedDays = journals.data?.data.elapsed_days ?? 1;

  return members.map((member) => {
    const j = scores.get(member.id);
    const c = checks.get(member.id);
    return {
      member,
      score: j?.average_score ?? 0,
      totalScore: j?.total_score ?? 0,
      modules: moduleStats(j?.average_score_each ?? EMPTY_MODULE_AVERAGES),
      moduleTotals: moduleStats(j?.total_score_each ?? EMPTY_MODULE_AVERAGES),
      elapsedDays,
      late: c?.late_count ?? 0,
      absent: c?.miss_count ?? 0,
      present: c?.check_count ?? 0,
    };
  });
}

/** One member's detail page: monthly recap, check-in recap, and streak. */
export async function fetchMemberDetail(id: string, month: Date) {
  const query = { month: fmtMonth(month) };
  const [journal, checkin, streak] = await Promise.all([
    api.users({ id }).journals.recap.get({ query }),
    api.users({ id }).checkins.recap.get({ query }),
    api.users({ id }).checkins.streak.get(),
  ]);

  const recap = journal.data?.data;
  const checks = checkin.data?.data;
  const scores = recap?.scores ?? [];

  return {
    scores,
    series: dailySeries(scores),
    levels: levelsByDay(scores),
    score: recap?.average_score ?? 0,
    totalScore: recap?.total_score ?? totalScore(scores),
    modules: moduleStats(recap?.average_score_each ?? EMPTY_MODULE_AVERAGES),
    moduleTotals: moduleStats(recap?.total_score_each ?? EMPTY_MODULE_AVERAGES),
    elapsedDays: recap?.elapsed_days ?? scores.length,
    perfect: scores.filter((s) => s.score === 100).length,
    tracked: scores.length,
    logged: scores.filter((s) => s.score > 0).length,
    late: checks?.late_count ?? 0,
    absent: checks?.miss_count ?? 0,
    streak: streak.data?.data.streak ?? 0,
    since: streak.data?.data.since ?? null,
  };
}

export type MemberDetail = Awaited<ReturnType<typeof fetchMemberDetail>>;

/** One member's record on one date, for the day-detail card. */
export async function fetchMemberDay(id: string, date: string) {
  const [journal, checkin] = await Promise.all([
    api.users({ id }).journals({ date }).get(),
    api.users({ id }).checkins({ date }).get(),
  ]);

  return {
    journal: (journal.data?.data ?? null) as Journal | null,
    check: (checkin.data?.data ?? null) as Check | null,
  };
}

export type MemberDay = Awaited<ReturnType<typeof fetchMemberDay>>;
