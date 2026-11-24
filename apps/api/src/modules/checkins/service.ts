import { toDateStr, wibHour } from '@be/lib/utils';
import { checkinsTable, db } from '@xirpl/db';
import { and, asc, between, eq, inArray, sql } from 'drizzle-orm';

const DAY_MS = 86_400_000;

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

/** Check row -> response `Check` shape. */
const toCheck = (row: typeof checkinsTable.$inferSelect) => ({
  date: row.date,
  is_checked: !!row.checked_in_at,
  type: row.type,
  checked_in_at: row.checked_in_at,
  checked_out_at: row.checked_out_at,
});

export const Checkins = {
  /** Check in for today. Returns the check row, or null if already checked in. */
  async checkIn(userId: string, type: 'school' | 'morning') {
    const date = toDateStr(new Date());
    const [row] = await db
      .insert(checkinsTable)
      .values({
        user_id: userId,
        date,
        type,
        checked_in_at: new Date(),
      })
      .onConflictDoNothing()
      .returning();
    return row ? toCheck(row) : null;
  },

  /**
   * Check out for today.
   * `{ ok: true, data }` on success; `{ ok: false, reason: 'not-checked-in' | 'already-out' }` otherwise.
   */
  async checkOut(userId: string) {
    const date = toDateStr(new Date());
    const [row] = await db
      .update(checkinsTable)
      .set({ checked_out_at: new Date() })
      .where(
        and(
          eq(checkinsTable.user_id, userId),
          eq(checkinsTable.date, date),
          sql`${checkinsTable.checked_out_at} IS NULL`,
        ),
      )
      .returning();
    if (row) return { ok: true, data: toCheck(row) };

    const [existing] = await db
      .select({ checked_in_at: checkinsTable.checked_in_at })
      .from(checkinsTable)
      .where(
        and(eq(checkinsTable.user_id, userId), eq(checkinsTable.date, date)),
      )
      .limit(1);
    if (!existing?.checked_in_at)
      return { ok: false, reason: 'not-checked-in' };
    return { ok: false, reason: 'already-out' };
  },

  /** Get check for a given date, or null. */
  async getByDate(userId: string, date: string) {
    const [row] = await db
      .select()
      .from(checkinsTable)
      .where(
        and(eq(checkinsTable.user_id, userId), eq(checkinsTable.date, date)),
      )
      .limit(1);
    return row ? toCheck(row) : null;
  },

  /** Current streak: consecutive on-time days ending at the most recent on-time check-in. */
  async getStreak(userId: string) {
    const rows = await db
      .select({
        date: checkinsTable.date,
        checked_in_at: checkinsTable.checked_in_at,
        type: checkinsTable.type,
      })
      .from(checkinsTable)
      .where(eq(checkinsTable.user_id, userId))
      .orderBy(asc(checkinsTable.date));
    const done = new Set(
      rows
        .filter((r) => r.checked_in_at && !isLate(r.checked_in_at, r.type))
        .map((r) => r.date),
    );
    const today = toDateStr(new Date());
    const since = [...done]
      .filter((d) => d <= today)
      .sort()
      .at(-1);
    if (!since) return { streak: 0, since: null };

    let streak = 0;
    let cur = since;
    // Bound traversal so malformed date data cannot occupy the event loop forever.
    while (done.has(cur) && streak < done.size) {
      streak++;
      cur = toDateStr(new Date(new Date(`${cur}T00:00:00`).getTime() - DAY_MS));
    }
    return { streak, since };
  },

  /** Monthly recap: every day of the month up to today with check-in status. */
  async getRecap(userId: string, month: string) {
    const today = toDateStr(new Date());
    const curMonth = today.slice(0, 7);
    const [y = 0, m = 0] = month.split('-').map(Number);
    const fullCap = new Date(y, m, 0).getDate();
    // Future month -> 0 days; current month -> up to today; past -> full month.
    const cap =
      month > curMonth
        ? 0
        : month === curMonth
          ? Math.min(fullCap, Number(today.slice(8, 10)))
          : fullCap;

    const { first, last } = monthBounds(month);
    const rows = await db
      .select()
      .from(checkinsTable)
      .where(
        and(
          eq(checkinsTable.user_id, userId),
          between(checkinsTable.date, first, last),
        ),
      );
    const byDate = new Map(rows.map((r) => [r.date, toCheck(r)]));

    const recap = [];
    for (let d = 1; d <= cap; d++) {
      const date = `${month}-${String(d).padStart(2, '0')}`;
      recap.push(
        byDate.get(date) ?? {
          date,
          is_checked: false,
          type: null,
          checked_in_at: null,
          checked_out_at: null,
        },
      );
    }

    const checkCount = rows.filter((r) => r.checked_in_at).length;
    const lateCount = rows.filter((r) =>
      isLate(r.checked_in_at, r.type),
    ).length;
    return {
      month,
      rate: Math.round((checkCount / cap) * 100) || 0,
      miss_count: cap - checkCount,
      check_count: checkCount,
      late_count: lateCount,
      recap,
    };
  },

  /** Per-student monthly recap for a list of student ids, using the same day-cap rules as `getMonthlyRecap`. */
  async getStudentRecap(studentIds: string[], month: string) {
    const today = toDateStr(new Date());
    const curMonth = today.slice(0, 7);
    const [y = 0, m = 0] = month.split('-').map(Number);
    const fullCap = new Date(y, m, 0).getDate();
    // Future month -> 0 days; current month -> up to today; past -> full month.
    const cap =
      month > curMonth
        ? 0
        : month === curMonth
          ? Math.min(fullCap, Number(today.slice(8, 10)))
          : fullCap;

    const { first, last } = monthBounds(month);
    const rows = studentIds.length
      ? await db
          .select()
          .from(checkinsTable)
          .where(
            and(
              inArray(checkinsTable.user_id, studentIds),
              between(checkinsTable.date, first, last),
            ),
          )
      : [];

    const students = studentIds.map((id) => {
      const studentRows = rows.filter((r) => r.user_id === id);
      const checkCount = studentRows.filter((r) => r.checked_in_at).length;
      const lateCount = studentRows.filter((r) =>
        isLate(r.checked_in_at, r.type),
      ).length;
      return {
        user_id: id,
        rate: Math.round((checkCount / cap) * 100) || 0,
        miss_count: cap - checkCount,
        check_count: checkCount,
        late_count: lateCount,
      };
    });

    return { month, students };
  },
};
