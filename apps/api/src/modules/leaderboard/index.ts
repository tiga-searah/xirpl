import { toDateStr } from '@be/lib/utils';
import Elysia from 'elysia';
import { requireAuth } from '../auth/middleware';
import { LeaderboardModel } from './model';
import { Leaderboard } from './service';

export const leaderboard = new Elysia({
  prefix: '/leaderboard',
  tags: ['Leaderboard'],
})
  .use(requireAuth)
  // GET /leaderboard
  .get(
    '/',
    async ({ query, status }) => {
      const data = await Leaderboard.getBoard(
        query.month ?? toDateStr().slice(0, 7),
      );
      return status(200, {
        success: true,
        message: 'Get leaderboard successful',
        data,
      });
    },
    {
      detail: {
        summary: 'Get Habit Leaderboard',
        description:
          'Get every student ranked by points earned in the given month (up to 100 points per day across attendance, prays, sports, and studies), each with their current check-in streak. Defaults to the current month.',
      },
      query: LeaderboardModel.query,
      response: {
        200: LeaderboardModel.response,
      },
    },
  );
