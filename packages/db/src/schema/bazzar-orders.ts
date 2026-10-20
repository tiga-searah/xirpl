import { sql } from 'drizzle-orm';
import { check, pgTable } from 'drizzle-orm/pg-core';
import { id } from './helpers';

export const bazzarOrdersTable = pgTable(
  'bazzar_orders',
  (t) => ({
    id,
    customer_name: t.text().notNull(),
    seller: t.text().notNull(),
    food_quantity: t.integer().notNull(),
    drink_quantity: t.integer().notNull(),
    price: t.integer().notNull(),
    note: t.text(),
    created_at: t.timestamp({ withTimezone: true }).notNull().defaultNow(),
    updated_at: t
      .timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  }),
  (order) => [
    check(
      'bazzar_orders_customer_name_nonempty',
      sql`length(trim(${order.customer_name})) > 0`,
    ),
    check(
      'bazzar_orders_seller_nonempty',
      sql`length(trim(${order.seller})) > 0`,
    ),
    check(
      'bazzar_orders_food_quantity_nonnegative',
      sql`${order.food_quantity} >= 0`,
    ),
    check(
      'bazzar_orders_drink_quantity_nonnegative',
      sql`${order.drink_quantity} >= 0`,
    ),
    check(
      'bazzar_orders_price_correct',
      sql`${order.price} = 5000 * (${order.food_quantity} + ${order.drink_quantity})`,
    ),
  ],
);
