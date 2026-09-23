import Elysia from 'elysia';
import { requireAuth } from '../auth/middleware';
import { NotificationsModel } from './model';
import { Notifications } from './service';

export const notifications = new Elysia({
  prefix: '/notifications',
  tags: ['Notifications'],
})
  .use(requireAuth)
  .get(
    '/subscriptions',
    async ({ auth, query, status }) => {
      if (
        query.endpoint !== undefined &&
        !Notifications.validEndpoint(query.endpoint)
      )
        return status(400, {
          success: false,
          message: 'Invalid notification subscription',
        });

      return status(200, {
        success: true,
        message: 'Get notification subscription successful',
        data: await Notifications.get(auth.user.id, query.endpoint),
      });
    },
    {
      query: NotificationsModel.getQuery,
      response: {
        200: NotificationsModel.getResponse,
        400: NotificationsModel.invalid,
      },
      detail: { summary: 'Get Notification Subscription' },
    },
  )
  .post(
    '/subscriptions',
    async ({ auth, body, status }) => {
      if (
        !Notifications.validEndpoint(body.endpoint) ||
        !Notifications.validKeys(body.keys)
      )
        return status(400, {
          success: false,
          message: 'Invalid notification subscription',
        });
      if (body.enabled && !Notifications.publicKey())
        return status(503, {
          success: false,
          message: 'Push notifications are unavailable',
        });
      if (!(await Notifications.subscribe(auth.user.id, body)))
        return status(409, {
          success: false,
          message: 'Notification subscription belongs to another user',
        });

      return status(200, {
        success: true,
        message: 'Save notification subscription successful',
      });
    },
    {
      body: NotificationsModel.subscribeBody,
      response: {
        200: NotificationsModel.subscribeResponse,
        400: NotificationsModel.invalid,
        409: NotificationsModel.conflict,
        503: NotificationsModel.unavailable,
      },
      detail: { summary: 'Save Notification Subscription' },
    },
  )
  .patch(
    '/subscriptions',
    async ({ auth, body, status }) => {
      if (!Notifications.validEndpoint(body.endpoint))
        return status(400, {
          success: false,
          message: 'Invalid notification subscription',
        });
      if (body.enabled && !Notifications.publicKey())
        return status(503, {
          success: false,
          message: 'Push notifications are unavailable',
        });
      if (!(await Notifications.update(auth.user.id, body)))
        return status(404, {
          success: false,
          message: 'Notification subscription not found',
        });

      return status(200, {
        success: true,
        message: 'Update notification subscription successful',
      });
    },
    {
      body: NotificationsModel.updateBody,
      response: {
        200: NotificationsModel.updateResponse,
        400: NotificationsModel.invalid,
        404: NotificationsModel.notFound,
        503: NotificationsModel.unavailable,
      },
      detail: { summary: 'Update Notification Subscription' },
    },
  )
  .delete(
    '/subscriptions',
    async ({ auth, body, status }) => {
      if (!Notifications.validEndpoint(body.endpoint))
        return status(400, {
          success: false,
          message: 'Invalid notification subscription',
        });

      await Notifications.remove(auth.user.id, body.endpoint);
      return status(200, {
        success: true,
        message: 'Delete notification subscription successful',
      });
    },
    {
      body: NotificationsModel.deleteBody,
      response: {
        200: NotificationsModel.deleteResponse,
        400: NotificationsModel.invalid,
      },
      detail: { summary: 'Delete Notification Subscription' },
    },
  );
