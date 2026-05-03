import type { BaseOrderImportPreviewItem, BaseOrderImportPersistResult, ImportedBaseOrderRecord } from '@/shared/contracts/products/orders-import';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { COLLECTION, type ImportedBaseOrderDoc } from './types';
import { buildImportedOrderId, toDomain } from './mappers';

export type ProductOrdersImportRepository = {
  findByConnectionAndBaseOrderIds: (
    connectionId: string,
    baseOrderIds: string[]
  ) => Promise<ImportedBaseOrderRecord[]>;
  upsertOrders: (
    connectionId: string,
    orders: BaseOrderImportPreviewItem[]
  ) => Promise<{
    createdCount: number;
    updatedCount: number;
    syncedAt: string;
    results: BaseOrderImportPersistResult[];
  }>;
};

export const repository: ProductOrdersImportRepository = {
  async findByConnectionAndBaseOrderIds(
    connectionId: string,
    baseOrderIds: string[]
  ): Promise<ImportedBaseOrderRecord[]> {
    if (!connectionId.trim() || baseOrderIds.length === 0) {
      return [];
    }

    const db = await getMongoDb();
    const ids = baseOrderIds.map((baseOrderId) => buildImportedOrderId(connectionId, baseOrderId));
    const docs = await db
      .collection<ImportedBaseOrderDoc>(COLLECTION)
      .find({ _id: { $in: ids } })
      .toArray();

    return docs.map(toDomain);
  },

  async upsertOrders(connectionId: string, orders: BaseOrderImportPreviewItem[]) {
    const normalizedConnectionId = connectionId.trim();
    if (!normalizedConnectionId || orders.length === 0) {
      return {
        createdCount: 0,
        updatedCount: 0,
        syncedAt: new Date().toISOString(),
        results: [],
      };
    }

    const db = await getMongoDb();
    const now = new Date();
    const existing = await this.findByConnectionAndBaseOrderIds(
      normalizedConnectionId,
      orders.map((order) => order.baseOrderId)
    );
    const existingIds = new Set(existing.map((record) => record.baseOrderId));
    const results: BaseOrderImportPersistResult[] = [];
    let createdCount = 0;
    let updatedCount = 0;

    for (const order of orders) {
      const docId = buildImportedOrderId(normalizedConnectionId, order.baseOrderId);
      const alreadyExists = existingIds.has(order.baseOrderId);

      if (alreadyExists) {
        updatedCount += 1;
      } else {
        createdCount += 1;
      }

      await db.collection<ImportedBaseOrderDoc>(COLLECTION).updateOne(
        { _id: docId },
        {
          $set: {
            connectionId: normalizedConnectionId,
            baseOrderId: order.baseOrderId,
            orderNumber: order.orderNumber ?? null,
            externalStatusId: order.externalStatusId ?? null,
            externalStatusName: order.externalStatusName ?? null,
            buyerName: order.buyerName,
            buyerEmail: order.buyerEmail ?? null,
            currency: order.currency ?? null,
            totalGross: typeof order.totalGross === 'number' ? order.totalGross : null,
            deliveryMethod: order.deliveryMethod ?? null,
            paymentMethod: order.paymentMethod ?? null,
            source: order.source ?? null,
            orderCreatedAt: order.orderCreatedAt ?? null,
            orderUpdatedAt: order.orderUpdatedAt ?? null,
            lineItems: order.lineItems,
            fingerprint: order.fingerprint,
            raw: order.raw ?? null,
            updatedAt: now,
            lastImportedAt: now,
          },
          $setOnInsert: {
            createdAt: now,
            firstImportedAt: now,
          },
        },
        { upsert: true }
      );

      results.push({
        baseOrderId: order.baseOrderId,
        result: alreadyExists ? 'updated' : 'created',
      });
    }

    return {
      createdCount,
      updatedCount,
      syncedAt: now.toISOString(),
      results,
    };
  },
};
