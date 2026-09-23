import { sql } from 'drizzle-orm';
import { pgTable } from 'drizzle-orm/pg-core';
import { genders, islamicOrgs, roles } from './enums';
import { id, timestamps } from './helpers';

export const usersTable = pgTable('users', (t) => ({
  id: t.uuid().defaultRandom().primaryKey(),
  email: t.text().unique().notNull(),
  username: t.varchar({ length: 255 }).unique().notNull(),
  display_name: t.varchar({ length: 255 }),
  avatar_url: t.text(),
  nis: t.integer().unique(),
  bio: t.text(),
  gender: t.text({ enum: genders }),
  role: t.text({ enum: roles }).notNull(),
  islamic_org: t.text({ enum: islamicOrgs }),
  rfid_uid: t.varchar({ length: 20 }),
  last_sign_in_at: t.timestamp({ withTimezone: true }),
  ...timestamps,
}));

export const googleIdentitiesTable = pgTable('google_identities', (t) => ({
  id,
  user_id: t
    .uuid()
    .references(() => usersTable.id)
    .notNull(),
  sub: t.varchar({ length: 255 }).notNull().unique(),
  name: t.varchar().notNull(),
  given_name: t.varchar(),
  family_name: t.varchar(),
  picture: t.text(),
  access_token_hash: t.text().notNull(),
  access_token_expired_at: t.timestamp({ withTimezone: true }).notNull(),
  refresh_token_hash: t.text().notNull(),
  ...timestamps,
}));

export const sessionsTable = pgTable('sessions', (t) => ({
  id,
  user_id: t
    .uuid()
    .references(() => usersTable.id)
    .notNull(),
  user_agent: t.text(),
  ip: t.inet(),
  refresh_token_hash: t.text().unique().notNull(),
  refreshed_at: t.timestamp({ withTimezone: true }),
  expired_at: t
    .timestamp({ withTimezone: true })
    .notNull()
    .default(sql`now() + INTERVAL '30 days'`),
  ...timestamps,
}));
