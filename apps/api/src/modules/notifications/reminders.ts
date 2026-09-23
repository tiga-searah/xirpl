import { TZ_OFFSET } from '@be/lib/constants';
import { toDateStr } from '@be/lib/utils';
import {
  checkinsTable,
  db,
  notificationSubscriptionsTable as subscriptions,
} from '@xirpl/db';
import { and, eq, notExists, sql } from 'drizzle-orm';
import webpush from 'web-push';

const MINUTE_MS = 60_000;

export function reminderWindow(now = new Date()) {
  const local = new Date(now.getTime() + TZ_OFFSET * MINUTE_MS);
  if (local.getUTCHours() !== 6 || local.getUTCMinutes() !== 45) return null;
  return {
    date: toDateStr(now),
    expiresAt: now.getTime() + MINUTE_MS - (now.getTime() % MINUTE_MS),
  };
}

export async function sendCheckinReminders() {
  const window = reminderWindow();
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!window || !publicKey || !privateKey || !subject) return;

  const eligible = and(
    eq(subscriptions.enabled, true),
    sql`${subscriptions.last_reminded_date} IS DISTINCT FROM ${window.date}::date`,
    notExists(
      db
        .select({ id: checkinsTable.id })
        .from(checkinsTable)
        .where(
          and(
            eq(checkinsTable.user_id, subscriptions.user_id),
            eq(checkinsTable.date, window.date),
          ),
        ),
    ),
  );
  const candidates = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(eligible);
  for (const candidate of candidates) {
    if (!reminderWindow()) break;
    // Atomic claim rechecks opt-out/checkin and deduplicates across API processes.
    const [subscription] = await db
      .update(subscriptions)
      .set({ last_reminded_date: window.date })
      .where(and(eq(subscriptions.id, candidate.id), eligible))
      .returning();
    if (!subscription || !reminderWindow()) continue;

    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        JSON.stringify({
          title: 'Pengingat check-in',
          body: 'Kamu belum check-in hari ini. Yuk, check-in sekarang!',
          url: '/habit',
          tag: `checkin-${window.date}`,
          expiresAt: window.expiresAt,
        }),
        {
          vapidDetails: { subject, publicKey, privateKey },
          TTL: Math.max(0, Math.floor((window.expiresAt - Date.now()) / 1000)),
          urgency: 'high',
          timeout: Math.max(1, Math.min(10_000, window.expiresAt - Date.now())),
        },
      );
    } catch (error) {
      if (
        error instanceof webpush.WebPushError &&
        (error.statusCode === 404 || error.statusCode === 410)
      ) {
        await db
          .delete(subscriptions)
          .where(
            and(
              eq(subscriptions.id, subscription.id),
              eq(subscriptions.p256dh, subscription.p256dh),
              eq(subscriptions.auth, subscription.auth),
            ),
          );
      } else {
        // Do not log push endpoints/keys, or retry outside the reminder minute.
        console.error(
          'Checkin push delivery failed',
          subscription.id,
          error instanceof webpush.WebPushError
            ? error.statusCode
            : 'transport error',
        );
      }
    }
  }
}

export function startCheckinReminders() {
  let stopped = false;
  let timer: NodeJS.Timeout;
  const schedule = () => {
    if (stopped) return;
    timer = setTimeout(
      async () => {
        try {
          await sendCheckinReminders();
        } catch {
          console.error('Checkin reminder scheduler failed');
        } finally {
          schedule();
        }
      },
      MINUTE_MS - (Date.now() % MINUTE_MS),
    );
    timer.unref();
  };
  schedule();
  return () => {
    stopped = true;
    clearTimeout(timer);
  };
}
