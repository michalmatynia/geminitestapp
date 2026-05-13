import 'server-only';

import { ECOMMERCE_EXPORT_INTEGRATION_SLUG } from '@/shared/lib/integration-slugs';
import { getMongoDb } from '@/shared/lib/db/product-mongo-client';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';

const PRODUCT_LISTINGS_COLLECTION = 'product_listings';

type EcommerceProductListingDocument = {
  _id: string;
  connectionId: string;
  createdAt: Date;
  externalListingId: string | null;
  integrationId: string;
  inventoryId: string | null;
  productId: string;
  status: 'active';
  updatedAt: Date;
};

export const upsertEcommerceProductListing = async (productId: string): Promise<void> => {
  try {
    const db = await getMongoDb();
    const now = new Date();
    // Query by _id (primary key) to avoid duplicate key conflicts on concurrent upserts
    await db.collection<EcommerceProductListingDocument>(PRODUCT_LISTINGS_COLLECTION).updateOne(
      { _id: `ecom:${productId}` },
      {
        $set: {
          status: 'active',
          integrationId: ECOMMERCE_EXPORT_INTEGRATION_SLUG,
          connectionId: ECOMMERCE_EXPORT_INTEGRATION_SLUG,
          updatedAt: now,
        },
        $setOnInsert: {
          productId,
          externalListingId: null,
          inventoryId: null,
          createdAt: now,
        },
      },
      { upsert: true }
    );
  } catch (error) {
    void logSystemEvent({
      level: 'warn',
      message: 'ecommerce-product-export: failed to upsert product_listing badge record',
      source: 'ecommerce-product-export',
      context: { productId, error: error instanceof Error ? error.message : String(error) },
    });
  }
};
