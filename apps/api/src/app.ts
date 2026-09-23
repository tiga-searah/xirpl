import { adminUrl, webUrl } from '@be/lib/constants';
import { cors } from '@elysia/cors';
import openapi from '@elysia/openapi';
import { SITE_NAME } from '@xirpl/shared';
import { Elysia } from 'elysia';
import { auth } from './modules/auth';
import { calendar } from './modules/calendar';
import { checkins } from './modules/checkins';
import { checkinsAdmin } from './modules/checkins/admin';
import { iot } from './modules/iot';
import { journal } from './modules/journal';
import { journalAdmin } from './modules/journal/admin';
import { leaderboard } from './modules/leaderboard';
import { notifications } from './modules/notifications';
import { storage } from './modules/storage';
import { user } from './modules/user';

const app = new Elysia()
  .use(cors({ origin: [webUrl, adminUrl], credentials: true }))
  .use(
    openapi({
      path: '/docs',
      documentation: {
        info: {
          title: 'XI RPL API Documentation',
          version: '2.1.2',
          description:
            'XI RPL API is the backend API used for managing the XI RPL system. It is mainly used for https://xirpl.tigasearah.my.id\n' +
            '\n' +
            'This API is powered by ElysiaJS.',
        },
        tags: [
          {
            name: 'Authentication',
          },
          {
            name: 'Users',
          },
          {
            name: 'Internet of Things',
          },
          {
            name: 'Checkins',
          },
          {
            name: 'Journals',
          },
          {
            name: 'Leaderboard',
          },
          {
            name: 'Storage',
          },
          {
            name: 'Calendar',
          },
          {
            name: 'Notifications',
          },
        ],
        components: {
          securitySchemes: {
            'Access Token': {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
            },
          },
        },
      },
      scalar: {
        metaData: {
          title: `API Docs - ${SITE_NAME}`,
        },
        customCss: '',
        theme: 'kepler',
        hideClientButton: true,
      },
    }),
  )
  .onError(({ error, code, status }) => {
    if (code === 'UNKNOWN' || code === 'INTERNAL_SERVER_ERROR')
      return status(500, {
        success: false,
        message: 'Internal server error',
        ...(process.env.NODE_ENV === 'production'
          ? {}
          : {
              error,
            }),
      });
  })

  .use([
    auth,
    user,
    iot,
    checkins,
    checkinsAdmin,
    journal,
    journalAdmin,
    leaderboard,
    storage,
    calendar,
    notifications,
  ])
  .get('/', ({ redirect }) => redirect('/docs'), { detail: { hide: true } })
  .get('/health', () => ({ success: true, message: 'API is healthy' }), {
    detail: {
      summary: 'Health',
      description: 'Check the health of the API',
    },
  });

export default app;
export type App = typeof app;
