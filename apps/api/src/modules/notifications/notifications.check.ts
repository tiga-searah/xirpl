// Run against an isolated database after db:push:
// NOTIFICATION_CHECK_DATABASE_URL=postgres://... bun apps/api/src/modules/notifications/notifications.check.ts
import assert from 'node:assert/strict';
import { createECDH, createHmac, randomBytes, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { eq, inArray } from 'drizzle-orm';
import webpush from 'web-push';

assert(
  process.env.NOTIFICATION_CHECK_DATABASE_URL,
  'Set NOTIFICATION_CHECK_DATABASE_URL to an isolated database with schema applied',
);
process.env.DATABASE_URL = process.env.NOTIFICATION_CHECK_DATABASE_URL;
process.env.JWT_SECRET = 'notification-contract-check';
process.env.GOOGLE_CLIENT_ID = 'check';
process.env.GOOGLE_CLIENT_SECRET = 'check';
const vapid = webpush.generateVAPIDKeys();
process.env.VAPID_PUBLIC_KEY = vapid.publicKey;
process.env.VAPID_PRIVATE_KEY = vapid.privateKey;
process.env.VAPID_SUBJECT = 'mailto:check@example.com';
// Test loads DB/auth only after isolated environment is set; static imports use real credentials.
const {
  db,
  usersTable,
  sessionsTable,
  checkinsTable,
  notificationSubscriptionsTable: subscriptions,
} = await import('@xirpl/db');
const { notifications } = await import('./index');
const { reminderWindow, sendCheckinReminders } = await import('./reminders');
const { Notifications } = await import('./service');
const app = notifications.compile();
const ids = [randomUUID(), randomUUID(), randomUUID()];
const sessionId = randomUUID();
const ecdh = createECDH('prime256v1');
ecdh.generateKeys();
const keys = {
  p256dh: ecdh.getPublicKey().toString('base64url'),
  auth: randomBytes(16).toString('base64url'),
};
const endpoint = `https://fcm.googleapis.com/fcm/send/${randomUUID()}`;
const base64 = (value: object) =>
  Buffer.from(JSON.stringify(value)).toString('base64url');
const unsigned = `${base64({ alg: 'HS256', typ: 'JWT' })}.${base64({ sub: ids[0], sid: sessionId, exp: Math.floor(Date.now() / 1000) + 3600 })}`;
const token = `${unsigned}.${createHmac('sha256', process.env.JWT_SECRET).update(unsigned).digest('base64url')}`;
const request = (
  method: string,
  body?: object,
  query = '',
  authenticated = true,
) =>
  app.handle(
    new Request(`http://localhost/notifications/subscriptions${query}`, {
      method,
      headers: {
        ...(authenticated ? { authorization: `Bearer ${token}` } : {}),
        ...(body ? { 'content-type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    }),
  );
const RealDate = Date;
const realSend = webpush.sendNotification;
let instant = RealDate.parse('2026-09-22T23:45:00Z');
const sent: string[] = [];
try {
  await db.insert(usersTable).values(
    ids.map((id) => ({
      id,
      email: `${id}@example.com`,
      username: id,
      role: 'member' as const,
    })),
  );
  await db.insert(sessionsTable).values({
    id: sessionId,
    user_id: ids[0]!,
    refresh_token_hash: randomUUID(),
  });
  assert.equal((await request('GET', undefined, '', false)).status, 401);
  assert.equal(
    (await request('POST', { endpoint, keys, enabled: true })).status,
    200,
  );
  assert.equal(
    (await request('POST', { endpoint, keys, enabled: true })).status,
    200,
  );
  assert.equal(
    (
      await request('POST', {
        endpoint: 'https://127.0.0.1/private',
        keys,
        enabled: true,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await request('POST', {
        endpoint,
        keys: { ...keys, p256dh: 'A'.repeat(87) },
        enabled: true,
      })
    ).status,
    400,
  );
  assert.equal((await request('POST', { endpoint })).status, 422);
  assert.equal(
    await Notifications.subscribe(ids[1]!, { endpoint, keys, enabled: true }),
    false,
  );
  assert.equal(
    await Notifications.update(ids[1]!, { endpoint, enabled: false }),
    false,
  );
  await Notifications.remove(ids[1]!, endpoint);
  assert.equal((await Notifications.get(ids[0]!, endpoint)).enabled, true);
  assert.equal(
    (await request('PATCH', { endpoint, enabled: false })).status,
    200,
  );
  assert.equal((await Notifications.get(ids[0]!, endpoint)).enabled, false);
  assert.equal(
    (await request('PATCH', { endpoint, enabled: true })).status,
    200,
  );
  assert.equal(
    (await request('PATCH', { endpoint: `${endpoint}-missing`, enabled: true }))
      .status,
    404,
  );
  delete process.env.VAPID_PRIVATE_KEY;
  assert.equal(
    (await request('PATCH', { endpoint, enabled: true })).status,
    503,
  );
  assert.equal(
    (await request('PATCH', { endpoint, enabled: false })).status,
    200,
  );
  process.env.VAPID_PRIVATE_KEY = vapid.privateKey;
  await Notifications.update(ids[0]!, { endpoint, enabled: true });
  await Notifications.subscribe(ids[1]!, {
    endpoint: `${endpoint}-checked`,
    keys,
    enabled: true,
  });
  await Notifications.subscribe(ids[2]!, {
    endpoint: `${endpoint}-disabled`,
    keys,
    enabled: false,
  });
  await db.insert(checkinsTable).values({
    user_id: ids[1]!,
    date: '2026-09-23',
    type: 'school',
    checked_in_at: new Date('2026-09-22T23:30:00Z'),
  });
  // Yesterday's checkin must not suppress today's reminder.
  await db.insert(checkinsTable).values({
    user_id: ids[0]!,
    date: '2026-09-22',
    type: 'school',
    checked_in_at: new Date('2026-09-21T23:30:00Z'),
  });
  assert.equal(reminderWindow(new Date('2026-09-22T23:44:59Z')), null);
  assert.equal(reminderWindow(new Date('2026-09-22T23:46:00Z')), null);
  assert.equal(reminderWindow(new Date('2026-09-23T06:45:00Z')), null);
  assert.deepEqual(reminderWindow(new Date(instant)), {
    date: '2026-09-23',
    expiresAt: instant + 60_000,
  });
  globalThis.Date = class extends RealDate {
    constructor(value?: string | number | Date) {
      super(value === undefined ? instant : value);
    }
    static override now() {
      return instant;
    }
  } as DateConstructor;
  webpush.sendNotification = async (subscription, payload, options) => {
    assert(options?.TTL !== undefined && options.TTL <= 60);
    assert(typeof payload === 'string');
    const details = webpush.generateRequestDetails(
      subscription,
      payload,
      options,
    );
    assert(
      details.headers.Authorization || details.headers.authorization,
      'VAPID authorization present',
    );
    assert(
      details.body && details.body.length > 0,
      'Encrypted push body generated',
    );
    sent.push(subscription.endpoint);
    return { statusCode: 201, headers: {}, body: '' };
  };
  await Promise.all([sendCheckinReminders(), sendCheckinReminders()]);
  assert.deepEqual(
    sent,
    [endpoint],
    'Only unchecked enabled subscription; concurrent sends deduplicated',
  );
  await Notifications.subscribe(ids[0]!, { endpoint, keys, enabled: false });
  await Notifications.update(ids[0]!, { endpoint, enabled: true });
  await sendCheckinReminders();
  assert.equal(
    sent.length,
    1,
    'Re-subscription/toggle preserves daily deduplication',
  );
  instant += 86_400_000;
  await sendCheckinReminders();
  assert.equal(
    sent.length,
    3,
    'Next day re-eligible including yesterday checked user',
  );
  instant += 86_400_000;
  webpush.sendNotification = async () => {
    throw new webpush.WebPushError('Gone', 410, {}, '', endpoint);
  };
  await sendCheckinReminders();
  assert.equal(
    (await Notifications.get(ids[0]!, endpoint)).enabled,
    false,
    'Expired subscriptions removed',
  );
  globalThis.Date = RealDate;
  assert.equal((await request('DELETE', { endpoint })).status, 200);
  assert.equal((await request('DELETE', { endpoint })).status, 200);

  const handlers: Record<string, (event: unknown) => void> = {};
  const shown: unknown[] = [];
  const opened: string[] = [];
  let focused = 0;
  let windows: { url: string; focus: () => Promise<void> }[] = [];
  runInNewContext(
    readFileSync(
      new URL('../../../../web/public/sw.js', import.meta.url),
      'utf8',
    ),
    {
      Date: RealDate,
      URL,
      self: {
        addEventListener: (name: string, handler: (event: unknown) => void) => {
          handlers[name] = handler;
        },
        location: { origin: 'https://school.example' },
        registration: {
          showNotification: async (...args: unknown[]) => {
            shown.push(args);
          },
        },
        clients: {
          matchAll: async () => windows,
          openWindow: async (url: string) => {
            opened.push(url);
          },
        },
      },
    },
  );
  const event = async (name: string, values: object) => {
    let work: Promise<void> | undefined;
    handlers[name]!({
      ...values,
      waitUntil: (promise: Promise<void>) => {
        work = promise;
      },
    });
    await work;
  };
  const payload = {
    title: 'Checkin',
    body: 'Check in now',
    tag: 'checkin',
    url: '/habit',
    expiresAt: RealDate.now() + 60_000,
  };
  await event('push', { data: { json: () => payload } });
  await event('push', { data: { json: () => ({ ...payload, expiresAt: 0 }) } });
  await event('push', {
    data: { json: () => ({ ...payload, url: 'https://evil.example' }) },
  });
  await event('push', {
    data: {
      json: () => {
        throw new Error('invalid');
      },
    },
  });
  assert.equal(shown.length, 1, 'Only valid unexpired push displayed');
  await event('notificationclick', {
    notification: { close() {}, data: { url: 'https://evil.example' } },
  });
  assert.deepEqual(opened, ['https://school.example/habit']);
  windows = [
    {
      url: 'https://school.example/habit',
      focus: async () => {
        focused++;
      },
    },
  ];
  await event('notificationclick', { notification: { close() {} } });
  assert.equal(focused, 1);
  assert.equal(opened.length, 1);
  console.log(
    'PASS: authenticated subscription API, ownership, input validation, toggle, WIB timing, daily/concurrent deduplication, checkin exclusion, expiry cleanup, VAPID encryption, worker expiry/click safety',
  );
} finally {
  globalThis.Date = RealDate;
  webpush.sendNotification = realSend;
  await db.delete(checkinsTable).where(inArray(checkinsTable.user_id, ids));
  await db.delete(subscriptions).where(inArray(subscriptions.user_id, ids));
  await db.delete(sessionsTable).where(eq(sessionsTable.id, sessionId));
  await db.delete(usersTable).where(inArray(usersTable.id, ids));
  await db.$client.close();
}
