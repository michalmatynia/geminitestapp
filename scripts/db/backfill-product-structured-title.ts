import 'dotenv/config';

import { pathToFileURL } from 'node:url';

import { getMongoDb, invalidateMongoClientCache } from '@/shared/lib/db/mongo-client';
import { productCollectionName } from '@/shared/lib/products/services/product-repository/mongo-product-repository.helpers';

import { buildProductStructuredTitleBackfillResult } from './lib/product-structured-title-backfill';

type CliOptions = {
  dryRun: boolean;
  productId: string | null;
  limit: number | null;
};

type BackfillSummary = {
  mode: 'dry-run' | 'write';
  productFilter: string | null;
  limit: number | null;
  scannedProducts: number;
  affectedProducts: number;
  updatedProducts: number;
  populatedStructuredFields: number;
  clearedProducts: number;
  changedProductIds: string[];
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
  const options = parseArgs(argv);

  try {
    const db = await getMongoDb();
    const products = db.collection(productCollectionName);
    const query = options.productId
      ? {
          $or: [{ id: options.productId }, { _id: options.productId }],
        }
      : {};

    const cursor = products.find(query, {
      projection: {
        _id: 1,
        id: 1,
        name_en: 1,
        structuredTitle: 1,
      },
    });

    let scannedProducts = 0;
    let affectedProducts = 0;
    let updatedProducts = 0;
    let populatedStructuredFields = 0;
    let clearedProducts = 0;
    const changedProductIds: string[] = [];

    for await (const product of cursor) {
      scannedProducts += 1;
      const result = buildProductStructuredTitleBackfillResult(product);
      if (!result.changed) {
        continue;
      }

      affectedProducts += 1;
      populatedStructuredFields += result.populatedFieldCount;
      if (result.cleared) {
        clearedProducts += 1;
      }
      if (result.productId) {
        changedProductIds.push(result.productId);
      }

      if (!options.dryRun) {
        await products.updateOne(
          { _id: product._id },
          {
            $set: {
              structuredTitle: result.nextStructuredTitle,
            },
          }
        );
        updatedProducts += 1;
      }

      if (options.limit && affectedProducts >= options.limit) {
        break;
      }
    }

    const summary: BackfillSummary = {
      mode: options.dryRun ? 'dry-run' : 'write',
      productFilter: options.productId,
      limit: options.limit,
      scannedProducts,
      affectedProducts,
      updatedProducts,
      populatedStructuredFields,
      clearedProducts,
      changedProductIds,
    };

    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await invalidateMongoClientCache();
  }
}

const isEntrypoint =
  typeof process.argv[1] === 'string' &&
  process.argv[1].length > 0 &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isEntrypoint) {
  void main().catch((error) => {
    console.error('Failed to backfill product structured title fields:', error);
    process.exit(1);
  });
}
