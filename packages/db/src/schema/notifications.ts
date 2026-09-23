import { pgTable } from 'drizzle-orm/pg-core';
import { usersTable } from './auth';
import { id, timestamps } from './helpers';

export const notificationSubscriptionsTable = pgTable(
  'notification_subscriptions',
  (t) => ({
    id,
    user_id: t
      .uuid()
      .references(() => usersTable.id, { onDelete: 'cascade' })
      .notNull(),
    endpoint: t.text().unique().notNull(),
    p256dh: t.text().notNull(),
    auth: t.text().notNull(),
    enabled: t.boolean().notNull().default(true),
    last_reminded_date: t.date(),
    ...timestamps,
  }),
);
