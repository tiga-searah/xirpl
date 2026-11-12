import type { AuthModel } from '@be/modules/auth/model';
import type { CheckinsModel } from '@be/modules/checkins/model';
import type { JournalModel } from '@be/modules/journal/model';
import type { UserModel } from '@be/modules/user/model';

export type Member = UserModel['Student'];
export type Journal = JournalModel['Journal'];
export type Check = CheckinsModel['Check'];
export type ModuleKey = 'ibadah' | 'hadir' | 'olahraga' | 'belajar';
export type DayScore = JournalModel['recapResponse']['data']['scores'][number];

export type MemberRow = {
  member: Member;
  score: number;
  totalScore?: number;
  modules: Record<ModuleKey, number>;
  moduleTotals?: Record<ModuleKey, number>;
  elapsedDays?: number;
  late: number;
  absent: number;
  present: number;
};

export type ClassSummary = {
  score: number;
  totalScore?: number;
  modules: Record<ModuleKey, number>;
  moduleTotals?: Record<ModuleKey, number>;
  studentCount?: number;
  elapsedDays?: number;
  perfect: number;
  streaking: number;
  late: number;
  atRisk: number;
  trend: { day: number; value: number }[];
  buckets: { range: string; count: number }[];
};

export type MemberDetail = {
  scores: DayScore[];
  series: { day: number; value: number }[];
  levels: Map<number, number>;
  score: number;
  totalScore?: number;
  modules: Record<ModuleKey, number>;
  moduleTotals?: Record<ModuleKey, number>;
  elapsedDays?: number;
  perfect: number;
  tracked: number;
  logged: number;
  late: number;
  absent: number;
  streak: number;
  since: string | null;
};

export type MemberDay = { journal: Journal | null; check: Check | null };

export type AttendanceCopy = {
  title: string;
  noun: string;
  action: string;
  doneAction: string;
  ok: string;
  late: string;
  deadline: string;
  verb: string;
};

/**
 * Everything the dashboard components need from the host app: fetchers, auth,
 * and the habit constants. The app that mounts the dashboard owns the data.
 */
export type HabitAdminCtx = {
  useUser: () => {
    loading: boolean;
    isAuthenticated: boolean;
    user?: AuthModel['meResponse']['data'];
  };
  isAdminRole: (role?: string | null) => boolean;
  fileUrl: (name: string) => string;
  fetchMembers: () => Promise<Member[]>;
  fetchClassSummary: (month: Date) => Promise<ClassSummary>;
  fetchMemberRows: (members: Member[], month: Date) => Promise<MemberRow[]>;
  fetchMemberDetail: (id: string, month: Date) => Promise<MemberDetail>;
  fetchMemberDay: (id: string, date: string) => Promise<MemberDay>;
  downloadRecapPdf: (month: Date) => Promise<void>;
  MODULE_HEX: Record<ModuleKey, string>;
  MODULES: readonly {
    key: ModuleKey;
    label: string;
    max: number;
    dot: string;
    text: string;
  }[];
  IBADAH: readonly { label: string; field: keyof Journal }[];
  MONTHS: string[];
  WEEKDAYS: readonly string[];
  HEAT_BG: string[];
  HEAT_TEXT: string[];
  sameDay: (a: Date, b: Date) => boolean;
  toLocalDate: (date: string) => Date;
  fmtDate: (d: Date) => string;
  fmtTime: (at: Date | string) => string;
  checkinAt: (c: Check | null) => Date | null;
  isLateCheck: (c: Check | null) => boolean;
  lateLabel: (at: Date) => string;
  level: (j: Journal | null, c: Check | null) => number;
  attendanceCopy: (d: Date) => AttendanceCopy;
};
