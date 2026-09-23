import { ECDH } from 'node:crypto';
import { db, notificationSubscriptionsTable } from '@xirpl/db';
import { and, eq } from 'drizzle-orm';
import type { NotificationsModel } from './model';

const pushHosts = [
  'fcm.googleapis.com',
  'push.services.mozilla.com',
  'web.push.apple.com',
  'notify.windows.com',
];

export const Notifications = {
  publicKey() {
    const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
    return VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY && VAPID_SUBJECT
      ? VAPID_PUBLIC_KEY
      : null;
  },

  validEndpoint(endpoint: string) {
    if (
      endpoint.length > 2048 ||
      !/^https:\/\//i.test(endpoint) ||
      /[\s\\#]/.test(endpoint)
    )
      return false;

    try {
      const url = new URL(endpoint);
      const authority = endpoint.slice(8).split(/[/?]/, 1)[0]!;
      return (
        url.protocol === 'https:' &&
        !url.username &&
        !url.password &&
        !authority.includes('@') &&
        !url.port &&
        pushHosts.some(
          (host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
        )
      );
    } catch {
      return false;
    }
  },

  validKeys(keys: NotificationsModel['subscribeBody']['keys']) {
    if (
      !/^[A-Za-z0-9_-]{87}=?$/.test(keys.p256dh) ||
      !/^[A-Za-z0-9_-]{22}(==)?$/.test(keys.auth)
    )
      return false;

    const publicKey = Buffer.from(keys.p256dh, 'base64url');
    const auth = Buffer.from(keys.auth, 'base64url');
    if (
      publicKey.length !== 65 ||
      publicKey[0] !== 4 ||
      auth.length !== 16 ||
      publicKey.toString('base64url') !== keys.p256dh.replace(/=+$/, '') ||
      auth.toString('base64url') !== keys.auth.replace(/=+$/, '')
    )
      return false;

    try {
      ECDH.convertKey(publicKey, 'prime256v1');
      return true;
    } catch {
      return false;
    }
  },

  async get(userId: string, endpoint?: string) {
    if (!endpoint) return { enabled: false, publicKey: this.publicKey() };

    const [subscription] = await db
      .select({ enabled: notificationSubscriptionsTable.enabled })
      .from(notificationSubscriptionsTable)
      .where(
        and(
          eq(notificationSubscriptionsTable.user_id, userId),
          eq(notificationSubscriptionsTable.endpoint, new URL(endpoint).href),
        ),
      )
      .limit(1);
    return {
      enabled: subscription?.enabled ?? false,
      publicKey: this.publicKey(),
    };
  },

  async subscribe(userId: string, body: NotificationsModel['subscribeBody']) {
    const values = {
      endpoint: new URL(body.endpoint).href,
      p256dh: body.keys.p256dh.replace(/=+$/, ''),
      auth: body.keys.auth.replace(/=+$/, ''),
      enabled: body.enabled,
    };
    const [subscription] = await db
      .insert(notificationSubscriptionsTable)
      .values({ user_id: userId, ...values })
      .onConflictDoUpdate({
        target: notificationSubscriptionsTable.endpoint,
        set: values,
        setWhere: eq(notificationSubscriptionsTable.user_id, userId),
      })
      .returning({ id: notificationSubscriptionsTable.id });
    return !!subscription;
  },

  async update(userId: string, body: NotificationsModel['updateBody']) {
    const [subscription] = await db
      .update(notificationSubscriptionsTable)
      .set({ enabled: body.enabled })
      .where(
        and(
          eq(notificationSubscriptionsTable.user_id, userId),
          eq(
            notificationSubscriptionsTable.endpoint,
            new URL(body.endpoint).href,
          ),
        ),
      )
      .returning({ id: notificationSubscriptionsTable.id });
    return !!subscription;
  },

  async remove(userId: string, endpoint: string) {
    await db
      .delete(notificationSubscriptionsTable)
      .where(
        and(
          eq(notificationSubscriptionsTable.user_id, userId),
          eq(notificationSubscriptionsTable.endpoint, new URL(endpoint).href),
        ),
      );
  },
};
