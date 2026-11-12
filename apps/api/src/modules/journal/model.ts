import { r } from '@be/lib/schema';
import type { DeepUnwrap } from '@be/lib/utils';
import { t } from 'elysia';

const Journal = t.Object({
  prayed_dhuha: t.Nullable(t.Boolean()),
  prayed_tahajud: t.Nullable(t.Boolean()),
  prayed_qabliyah_fajr: t.Nullable(t.Boolean()),
  prayed_badiyah_isya: t.Nullable(t.Boolean()),

  did_sport: t.Nullable(t.Boolean()),
  sport_type: t.Nullable(t.String()),
  sport_duration: t.Nullable(t.Number()),
  sport_proof_url: t.Nullable(t.String()),
  sport_skip_reason: t.Nullable(t.String()),

  did_study: t.Nullable(t.Boolean()),
  study_about: t.Nullable(t.String()),
  study_media: t.Nullable(t.String()),
  study_start_proof_url: t.Nullable(t.String()),
  study_end_proof_url: t.Nullable(t.String()),
  study_skip_reason: t.Nullable(t.String()),
});

export const JournalModel = {
  Journal,

  upsertBody: t.Object({
    ...t.Partial(Journal).properties,
    date: t.Optional(t.String({ format: 'date' })),
  }),
  upsertResponse: r.Success('Journal upsert successful'),
  journalLocked: r.Failed('Journal for this date is locked'),
  getJournalParam: t.Object({
    date: t.String({ format: 'date' }),
  }),
  getJournalResponse: r.Data('Get journal successful', Journal),
  getJournalEmpty: r.Failed('Journal is empty'),
  journalNotFound: t.Union([
    r.Failed('User not found'),
    r.Failed('Journal is empty'),
  ]),

  recapQuery: t.Object({
    month: t.String({ pattern: '^\\d{4}-(0[1-9]|1[0-2])$' }),
  }),
  recapResponse: r.Data(
    'Get journal recap successful',
    t.Object({
      month: t.String({ pattern: '^\\d{4}-(0[1-9]|1[0-2])$' }),
      rate: t.Number(),
      average_score: t.Number(),
      total_score: t.Number(),
      average_score_each: t.Object({
        checkins: t.Number(),
        prays: t.Number(),
        sports: t.Number(),
        studies: t.Number(),
      }),
      total_score_each: t.Object({
        checkins: t.Number(),
        prays: t.Number(),
        sports: t.Number(),
        studies: t.Number(),
      }),
      elapsed_days: t.Number(),
      scores: t.Array(
        t.Object({
          date: t.String({ format: 'date' }),
          score: t.Number(),
        }),
      ),
    }),
  ),

  statsQuery: t.Object({
    month: t.String({ pattern: '^\\d{4}-(0[1-9]|1[0-2])$' }),
  }),
  statsResponse: r.Data(
    'Get monthly journal stats successful',
    t.Object({
      month: t.String({ pattern: '^\\d{4}-(0[1-9]|1[0-2])$' }),
      average_score: t.Number(),
      total_score: t.Number(),
      average_score_each: t.Object({
        checkins: t.Number(),
        prays: t.Number(),
        sports: t.Number(),
        studies: t.Number(),
      }),
      total_score_each: t.Object({
        checkins: t.Number(),
        prays: t.Number(),
        sports: t.Number(),
        studies: t.Number(),
      }),
      student_count: t.Number(),
      elapsed_days: t.Number(),
      scores: t.Array(
        t.Object({
          date: t.String({ format: 'date' }),
          score: t.Number(),
        }),
      ),
      score_distribution: t.Object({
        '0-20': t.Number(),
        '21-40': t.Number(),
        '41-60': t.Number(),
        '61-80': t.Number(),
        '81-100': t.Number(),
      }),
      completed_days: t.Number(),
      students_on_streaks: t.Number(),
      late_count: t.Number(),
      need_attention_count: t.Number(),
    }),
  ),

  studentsQuery: t.Object({
    month: t.String({ pattern: '^\\d{4}-(0[1-9]|1[0-2])$' }),
  }),
  studentsResponse: r.Data(
    "Get monthly student's journal stats successful",
    t.Object({
      month: t.String({ pattern: '^\\d{4}-(0[1-9]|1[0-2])$' }),
      elapsed_days: t.Number(),
      students: t.Array(
        t.Object({
          user_id: t.String(),
          average_score: t.Number(),
          total_score: t.Number(),
          average_score_each: t.Object({
            checkins: t.Number(),
            prays: t.Number(),
            sports: t.Number(),
            studies: t.Number(),
          }),
          total_score_each: t.Object({
            checkins: t.Number(),
            prays: t.Number(),
            sports: t.Number(),
            studies: t.Number(),
          }),
        }),
      ),
    }),
  ),

  idParam: t.Object({ id: t.String() }),
  userInvalid: r.Failed('User not found'),

  pdfQuery: t.Object({
    month: t.String({ pattern: '^\\d{4}-(0[1-9]|1[0-2])$' }),
  }),
};

export type JournalModel = {
  [k in keyof typeof JournalModel]: DeepUnwrap<(typeof JournalModel)[k]>;
};
