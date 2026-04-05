import 'dotenv/config';

import { pathToFileURL } from 'node:url';

import { listAllProductListingsAcrossProviders } from '@/features/integrations/services/product-listing-repository';
import { getMongoClient, getMongoDb } from '@/shared/lib/db/mongo-client';

import { buildProductImportSourceBackfillPlan } from './lib/product-import-source-backfill';

type ProductImportSourceRecord = {
  id?: unknown;
  importSource?: unknown;
};

type CliOptions = {
  dryRun: boolean;
  productId: string | null;
  limit: number | null;
};

type BackfillSummary = {
  mode: 'dry-run' | 'write';
  productFilter: string | null;
  limit: number | null;
  scannedListings: number;
  candidateImportedProducts: number;
  scannedProducts: number;
  targetProducts: number;
  updatedProducts: number;
  targetProductIds: string[];
  alreadyTaggedProductIds: string[];
};

const normalizeTrimmedString = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const parseArgs = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    dryRun: true,
    productId: null,
    limit: null,
  };

  argv.forEach((arg: string): void => {
    if (arg === '--write') {
      options.dryRun = false;
      return;
    }
    if (arg.startsWith('--product=')) {
      const productId = normalizeTrimmedString(arg.slice('--product='.length));
      options.productId = productId || null;
      return;
    }
    if (arg.startsWith('--limit=')) {
      const parsed = Number.parseInt(arg.slice('--limit='.length), 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        options.limit = parsed;
      }
    }
  });

  return options;
};

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  const mongoClient = await getMongoClient();
  const options = parseArgs(argv);

  try {
    const db = await getMongoDb();
    const allListings = await listAllProductListingsAcrossProviders();
    const listings = options.productId
      ? allListings.filter((listing) => listing.productId === options.productId)
      : allListings;

    const plan = buildProductImportSourceBackfillPlan({
      listings,
      products: await db
        .collection('products')
        .find(
          {
            ...(options.productId
              ? { id: options.productId }
              : {
                  id: {
                    $in: Array.from(
                      new Set(listings.map((listing) => normalizeTrimmedString(listing.productId)))
                    ).filter((id) => id.length > 0),
                  },
                }),
          },
          {
            projection: {
              _id: 0,
              id: 1,
              importSource: 1,
            },
          }
        )
        .toArray() as unknown as ProductImportSourceRecord[],
    });

    const targetProductIds =
      options.limit && options.limit > 0
        ? plan.targetProductIds.slice(0, options.limit)
        : plan.targetProductIds;

    let updatedProducts = 0;
    if (!options.dryRun && targetProductIds.length > 0) {
      const result = await db.collection('products').updateMany(
        { id: { $in: targetProductIds } },
        { $set: { importSource: 'base' } }
      );
      updatedProducts = result.modifiedCount;
    }

    const summary: BackfillSummary = {
      mode: options.dryRun ? 'dry-run' : 'write',
      productFilter: options.productId,
      limit: options.limit,
      scannedListings: listings.length,
      candidateImportedProducts: plan.candidateImportedProductIds.length,
      scannedProducts:
        targetProductIds.length + plan.alreadyTaggedProductIds.length,
      targetProducts: targetProductIds.length,
      updatedProducts,
      targetProductIds,
      alreadyTaggedProductIds: plan.alreadyTaggedProductIds,
    };

    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await mongoClient.close();
  }
}

const isEntrypoint =
  typeof process.argv[1] === 'string' &&
  process.argv[1].length > 0 &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isEntrypoint) {
  void main().catch((error) => {
    console.error('Failed to backfill product import provenance:', error);
    process.exit(1);
  });
}
