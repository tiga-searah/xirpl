import { r } from '@be/lib/schema';
import { type Static, t } from 'elysia';

const order = t.Object({
  id: t.String({ format: 'uuid' }),
  customer_name: t.String(),
  seller: t.String(),
  food_quantity: t.Integer(),
  drink_quantity: t.Integer(),
  food_flavors: t.Array(t.String()),
  price: t.Integer(),
  note: t.Nullable(t.String()),
  done: t.Boolean(),
  created_at: t.String({ format: 'date-time' }),
  updated_at: t.String({ format: 'date-time' }),
});

export type BazzarOrder = Static<typeof order>;

export const BazzarOrdersModel = {
  order,
  body: t.Object(
    {
      customer_name: t.String({ minLength: 1, pattern: '\\S' }),
      seller: t.String({ minLength: 1, pattern: '\\S' }),
      food_quantity: t.Integer({ minimum: 0, maximum: 214748 }),
      drink_quantity: t.Integer({ minimum: 0, maximum: 214748 }),
      // One entry per pangsit that picked a flavour; mixed pangsit carry "pedas+manis".
      // ponytail: 1024 cap is far above any real bazzar order.
      food_flavors: t.Optional(
        t.Array(t.String({ maxLength: 64 }), { maxItems: 1024 }),
      ),
      note: t.Optional(t.String()),
    },
    { additionalProperties: false },
  ),
  doneBody: t.Object({ done: t.Boolean() }, { additionalProperties: false }),
  params: t.Object({ id: t.String({ format: 'uuid' }) }),
  listResponse: r.Data('Get bazzar orders successful', t.Array(order)),
  getResponse: r.Data('Get bazzar order successful', order),
  createResponse: r.Data('Create bazzar order successful', order),
  updateResponse: r.Data('Update bazzar order successful', order),
  doneResponse: r.Data('Mark bazzar order done successful', order),
  deleteResponse: r.Success('Delete bazzar order successful'),
  notFound: r.Failed('Bazzar order not found'),
  emptyOrder: r.Failed('Bazzar order needs at least one item'),
};
