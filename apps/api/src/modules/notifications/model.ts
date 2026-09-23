import { r } from '@be/lib/schema';
import type { DeepUnwrap } from '@be/lib/utils';
import { t } from 'elysia';

const endpoint = t.String({ minLength: 1, maxLength: 2048, format: 'uri' });

export const NotificationsModel = {
  getQuery: t.Object({ endpoint: t.Optional(endpoint) }),
  subscribeBody: t.Object({
    endpoint,
    keys: t.Object({
      p256dh: t.String({
        minLength: 87,
        maxLength: 88,
        pattern: '^[A-Za-z0-9_-]{87}=?$',
      }),
      auth: t.String({
        minLength: 22,
        maxLength: 24,
        pattern: '^[A-Za-z0-9_-]{22}(==)?$',
      }),
    }),
    enabled: t.Boolean(),
  }),
  updateBody: t.Object({ endpoint, enabled: t.Boolean() }),
  deleteBody: t.Object({ endpoint }),
  getResponse: r.Data(
    'Get notification subscription successful',
    t.Object({ enabled: t.Boolean(), publicKey: t.Nullable(t.String()) }),
  ),
  subscribeResponse: r.Success('Save notification subscription successful'),
  updateResponse: r.Success('Update notification subscription successful'),
  deleteResponse: r.Success('Delete notification subscription successful'),
  invalid: r.Failed('Invalid notification subscription'),
  notFound: r.Failed('Notification subscription not found'),
  conflict: r.Failed('Notification subscription belongs to another user'),
  unavailable: r.Failed('Push notifications are unavailable'),
};

export type NotificationsModel = {
  [k in keyof typeof NotificationsModel]: DeepUnwrap<
    (typeof NotificationsModel)[k]
  >;
};
