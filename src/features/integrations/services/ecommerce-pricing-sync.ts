import 'server-only';

import type { AnyBulkWriteOperation, Filter } from 'mongodb';

import { validationError } from '@/shared/errors/app-error';

import {
  getAllEcommerceExportDbTargetsForWrite,
  type EcommerceExportDbTarget,
} from './ecommerce-product-export.config';
import { ECOMMERCE_PRODUCT_SOURCE } from './ecommerce-product-export.mapper';
import {
  CURRENCIES_COLLECTION,
  PRICE_GROUPS_COLLECTION,
  readSourcePricing,
  type PricingSourceSnapshot,
} from './ecommerce-pricing-sync.documents';

export type EcommercePricingSyncTargetResult = {
  currencyCount: number;
  dbName: string;
  deletedCurrencyCount: number;
  deletedPriceGroupCount: number;
  matchedCurrencyCount: number;
  matchedPriceGroupCount: number;
  modifiedCurrencyCount: number;
  modifiedPriceGroupCount: number;
  priceGroupCount: number;
  source: EcommerceExportDbTarget['source'];
  upsertedCurrencyCount: number;
  upsertedPriceGroupCount: number;
};

export type EcommercePricingSyncResult = {
  sourceCurrencyCount: number;
  sourcePriceGroupCount: number;
  syncedAt: string;
  targets: EcommercePricingSyncTargetResult[];
};

type SyncablePricingDocument = {
  _id: string;
  source: typeof ECOMMERCE_PRODUCT_SOURCE;
  syncedAt: Date;
};

type CollectionSyncResult = {
  deletedCount: number;
  matchedCount: number;
  modifiedCount: number;
  upsertedCount: number;
};

const toDocumentUpdateSet = <T extends { _id: string }>(document: T): Omit<T, '_id'> => {
  const updateSet: Partial<T> = { ...document };
  delete updateSet._id;
  return updateSet as Omit<T, '_id'>;
};

const syncCollection = async (
  target: EcommerceExportDbTarget,
  collectionName: string,
  documents: SyncablePricingDocument[]
): Promise<CollectionSyncResult> => {
  const collection = target.db.collection<SyncablePricingDocument>(collectionName);
  const ids = documents.map((document) => document._id);
  const operations: AnyBulkWriteOperation<SyncablePricingDocument>[] = documents.map((document) => ({
    updateOne: {
      filter: { _id: document._id },
      update: {
        $set: toDocumentUpdateSet(document),
        $setOnInsert: { createdAt: document.syncedAt },
      },
      upsert: true,
    },
  }));
  const deleteFilter: Filter<SyncablePricingDocument> = {
    source: ECOMMERCE_PRODUCT_SOURCE,
    _id: { $nin: ids },
  };
  const writeResult =
    operations.length > 0
      ? await collection.bulkWrite(operations, { ordered: false })
      : { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
  const deleteResult = await collection.deleteMany(deleteFilter);
  return {
    deletedCount: deleteResult.deletedCount,
    matchedCount: writeResult.matchedCount,
    modifiedCount: writeResult.modifiedCount,
    upsertedCount: writeResult.upsertedCount,
  };
};

const syncPricingToTarget = async (
  target: EcommerceExportDbTarget,
  snapshot: PricingSourceSnapshot
): Promise<EcommercePricingSyncTargetResult> => {
  const [currencyResult, priceGroupResult] = await Promise.all([
    syncCollection(target, CURRENCIES_COLLECTION, snapshot.currencies),
    syncCollection(target, PRICE_GROUPS_COLLECTION, snapshot.priceGroups),
  ]);
  return {
    currencyCount: snapshot.currencies.length,
    dbName: target.dbName,
    deletedCurrencyCount: currencyResult.deletedCount,
    deletedPriceGroupCount: priceGroupResult.deletedCount,
    matchedCurrencyCount: currencyResult.matchedCount,
    matchedPriceGroupCount: priceGroupResult.matchedCount,
    modifiedCurrencyCount: currencyResult.modifiedCount,
    modifiedPriceGroupCount: priceGroupResult.modifiedCount,
    priceGroupCount: snapshot.priceGroups.length,
    source: target.source,
    upsertedCurrencyCount: currencyResult.upsertedCount,
    upsertedPriceGroupCount: priceGroupResult.upsertedCount,
  };
};

export const syncEcommercePricingFromProductsLocalMongo =
  async (): Promise<EcommercePricingSyncResult> => {
    const snapshot = await readSourcePricing();
    if (snapshot.currencies.length === 0 || snapshot.priceGroups.length === 0) {
      throw validationError('No local Products pricing system was found to sync.', {
        currencyCount: snapshot.currencies.length,
        priceGroupCount: snapshot.priceGroups.length,
        reason: 'missing_local_product_pricing',
      });
    }

    const targets = await getAllEcommerceExportDbTargetsForWrite();
    const targetResults = await Promise.all(
      targets.map((target) => syncPricingToTarget(target, snapshot))
    );

    return {
      sourceCurrencyCount: snapshot.currencies.length,
      sourcePriceGroupCount: snapshot.priceGroups.length,
      syncedAt: snapshot.syncedAt.toISOString(),
      targets: targetResults,
    };
  };
