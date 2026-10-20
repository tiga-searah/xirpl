import { r } from '@be/lib/schema';
import { type Static, t } from 'elysia';

const order = t.Object({
  id: t.String({ format: 'uuid' }),
  customer_name: t.String(),
  seller: t.String(),
  food_quantity: t.Integer(),
  drink_quantity: t.Integer(),
  price: t.Integer(),
  note: t.Nullable(t.String()),
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
      note: t.Optional(t.String()),
    },
    { additionalProperties: false },
  ),
  params: t.Object({ id: t.String({ format: 'uuid' }) }),
  listResponse: r.Data('Get bazzar orders successful', t.Array(order)),
  getResponse: r.Data('Get bazzar order successful', order),
  createResponse: r.Data('Create bazzar order successful', order),
  updateResponse: r.Data('Update bazzar order successful', order),
  deleteResponse: r.Success('Delete bazzar order successful'),
  notFound: r.Failed('Bazzar order not found'),
};
