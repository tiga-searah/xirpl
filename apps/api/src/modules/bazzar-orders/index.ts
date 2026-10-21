import { bazzarOrdersTable, db } from '@xirpl/db';
import { desc, eq } from 'drizzle-orm';
import Elysia from 'elysia';
import { requireBazzar } from '../auth/middleware';
import { normalizeFlavors } from './flavors';
import { BazzarOrdersModel } from './model';

const row = (order: typeof bazzarOrdersTable.$inferSelect) => ({
  ...order,
  created_at: order.created_at.toISOString(),
  updated_at: order.updated_at.toISOString(),
});

const orderValues = (body: {
  customer_name: string;
  seller: string;
  food_flavors?: string[];
  food_quantity: number;
  drink_quantity: number;
  note?: string;
}) => ({
  ...body,
  food_flavors: normalizeFlavors(body.food_flavors),
  note: body.note?.trim() || null,
  price: 5000 * (body.food_quantity + body.drink_quantity),
});

const isEmpty = (body: { food_quantity: number; drink_quantity: number }) =>
  body.food_quantity + body.drink_quantity === 0;

export const bazzarOrders = new Elysia({
  prefix: '/bazzar-orders',
  tags: ['Bazzar Orders'],
})
  .use(requireBazzar)
  .get(
    '/',
    async ({ status }) => {
      const orders = await db
        .select()
        .from(bazzarOrdersTable)
        .orderBy(desc(bazzarOrdersTable.created_at));
      return status(200, {
        success: true,
        message: 'Get bazzar orders successful',
        data: orders.map(row),
      });
    },
    { response: { 200: BazzarOrdersModel.listResponse } },
  )
  .get(
    '/:id',
    async ({ params, status }) => {
      const [order] = await db
        .select()
        .from(bazzarOrdersTable)
        .where(eq(bazzarOrdersTable.id, params.id))
        .limit(1);
      if (!order)
        return status(404, {
          success: false,
          message: 'Bazzar order not found',
        });
      return status(200, {
        success: true,
        message: 'Get bazzar order successful',
        data: row(order),
      });
    },
    {
      params: BazzarOrdersModel.params,
      response: {
        200: BazzarOrdersModel.getResponse,
        404: BazzarOrdersModel.notFound,
      },
    },
  )
  .post(
    '/',
    async ({ body, status }) => {
      if (isEmpty(body))
        return status(400, {
          success: false,
          message: 'Bazzar order needs at least one item',
        });
      const [order] = await db
        .insert(bazzarOrdersTable)
        .values(orderValues(body))
        .returning();
      return status(200, {
        success: true,
        message: 'Create bazzar order successful',
        data: row(order!),
      });
    },
    {
      body: BazzarOrdersModel.body,
      response: {
        200: BazzarOrdersModel.createResponse,
        400: BazzarOrdersModel.emptyOrder,
      },
    },
  )
  .put(
    '/:id',
    async ({ body, params, status }) => {
      if (isEmpty(body))
        return status(400, {
          success: false,
          message: 'Bazzar order needs at least one item',
        });
      const [order] = await db
        .update(bazzarOrdersTable)
        .set(orderValues(body))
        .where(eq(bazzarOrdersTable.id, params.id))
        .returning();
      if (!order)
        return status(404, {
          success: false,
          message: 'Bazzar order not found',
        });
      return status(200, {
        success: true,
        message: 'Update bazzar order successful',
        data: row(order),
      });
    },
    {
      body: BazzarOrdersModel.body,
      params: BazzarOrdersModel.params,
      response: {
        200: BazzarOrdersModel.updateResponse,
        400: BazzarOrdersModel.emptyOrder,
        404: BazzarOrdersModel.notFound,
      },
    },
  )
  .patch(
    '/:id/done',
    async ({ body, params, status }) => {
      const [order] = await db
        .update(bazzarOrdersTable)
        .set({ done: body.done })
        .where(eq(bazzarOrdersTable.id, params.id))
        .returning();
      if (!order)
        return status(404, {
          success: false,
          message: 'Bazzar order not found',
        });
      return status(200, {
        success: true,
        message: 'Mark bazzar order done successful',
        data: row(order),
      });
    },
    {
      body: BazzarOrdersModel.doneBody,
      params: BazzarOrdersModel.params,
      response: {
        200: BazzarOrdersModel.doneResponse,
        404: BazzarOrdersModel.notFound,
      },
    },
  )
  .delete(
    '/:id',
    async ({ params, status }) => {
      const [order] = await db
        .delete(bazzarOrdersTable)
        .where(eq(bazzarOrdersTable.id, params.id))
        .returning({ id: bazzarOrdersTable.id });
      if (!order)
        return status(404, {
          success: false,
          message: 'Bazzar order not found',
        });
      return status(200, {
        success: true,
        message: 'Delete bazzar order successful',
      });
    },
    {
      params: BazzarOrdersModel.params,
      response: {
        200: BazzarOrdersModel.deleteResponse,
        404: BazzarOrdersModel.notFound,
      },
    },
  );
