import { toDateStr } from '@be/lib/utils';
import Elysia from 'elysia';
import { requireAuth } from '../auth/middleware';
import { JournalModel } from './model';
import { Journal } from './service';

export const journal = new Elysia({ prefix: '/journals', tags: ['Journals'] })
  .use(requireAuth)
  // PUT /journals
  .put(
    '/',
    async ({ auth, body, status }) => {
      const res = await Journal.upsert(auth.user.id, body);
      if (!res.ok) {
        return status(403, {
          success: false,
          message: 'Journal for this date is locked',
        });
      }
      return status(200, {
        success: true,
        message: 'Journal upsert successful',
      });
    },
    {
      detail: {
        summary: 'Upsert Journal',
        description:
          'Create or update the journal for today or within the 03:00 AM grace window. Partial bodies are allowed; only provided fields are written.',
      },
      body: JournalModel.upsertBody,
      response: {
        200: JournalModel.upsertResponse,
        403: JournalModel.journalLocked,
      },
    },
  )

  // GET /journals/today
  .get(
    '/today',
    async ({ auth, status }) => {
      const data = await Journal.getByDate(auth.user.id, toDateStr());
      if (!data)
        return status(404, {
          success: false,
          message: 'Journal is empty',
        });

      return status(200, {
        success: true,
        message: 'Get journal successful',
        data,
      });
    },
    {
      detail: {
        summary: "Get Today's Journal",
        description:
          "Get the journal for today. Returns 404 if today's journal is empty.",
      },
      response: {
        200: JournalModel.getJournalResponse,
        404: JournalModel.getJournalEmpty,
      },
    },
  )

  // GET /journals/:date
  .get(
    '/:date',
    async ({ auth, params, status }) => {
      const data = await Journal.getByDate(auth.user.id, params.date);
      if (!data)
        return status(404, {
          success: false,
          message: 'Journal is empty',
        });

      return status(200, {
        success: true,
        message: 'Get journal successful',
        data,
      });
    },
    {
      detail: {
        summary: 'Get Journal by Date',
        description:
          'Get the journal for a specific date. Returns 404 if no journal exists for that date.',
      },
      params: JournalModel.getJournalParam,
      response: {
        200: JournalModel.getJournalResponse,
        404: JournalModel.getJournalEmpty,
      },
    },
  )

  // GET /journals/recap
  .get(
    '/recap',
    async ({ auth, query, status }) => {
      const data = await Journal.getRecap(auth.user.id, query.month);
      return status(200, {
        success: true,
        message: 'Get journal recap successful',
        data,
      });
    },
    {
      detail: {
        summary: 'Get Journal Recap',
        description:
          'Monthly recap: per-day module completion, averages, and consistency rate up to today.',
      },
      query: JournalModel.recapQuery,
      response: {
        200: JournalModel.recapResponse,
      },
    },
  );
