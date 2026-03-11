import 'dotenv/config';

import { pathToFileURL } from 'node:url';

import { getMongoClient, getMongoDb } from '@/shared/lib/db/mongo-client';

import { backfillProductParameterLanguageValues } from './lib/product-parameter-inference-language-backfill';

type CliOptions = {
  dryRun: boolean;
  productId: string | null;
  languageCode: string;
  limit: number | null;
};

type BackfillSummary = {
  mode: 'dry-run' | 'write';
  languageCode: string;
  productFilter: string | null;
  limit: number | null;
  scannedProducts: number;
  affectedProducts: number;
  repairedParameters: number;
  updatedProducts: number;
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
    languageCode: 'en',
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
    if (arg.startsWith('--language=')) {
      const languageCode = normalizeTrimmedString(arg.slice('--language='.length)).toLowerCase();
      if (languageCode) {
        options.languageCode = languageCode;
      }
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
    const products = db.collection('products');

    const query: Record<string, unknown> = {
      parameters: { $exists: true, $type: 'array', $ne: [] },
    };
    if (options.productId) {
      query['id'] = options.productId;
    }

    const cursor = products.find(query, {
      projection: {
        _id: 0,
        id: 1,
        parameters: 1,
      },
    });

    let scannedProducts = 0;
    let affectedProducts = 0;
    let repairedParameters = 0;
    let updatedProducts = 0;
    const changedProductIds: string[] = [];

    for await (const product of cursor) {
      scannedProducts += 1;
      const productId = normalizeTrimmedString(product['id']);
      const repairResult = backfillProductParameterLanguageValues({
        parameters: product['parameters'],
        languageCode: options.languageCode,
      });
      if (!repairResult.changed) {
        continue;
      }

      affectedProducts += 1;
      repairedParameters += repairResult.repairedCount;
      if (productId) {
        changedProductIds.push(productId);
      }

      if (!options.dryRun && productId) {
        await products.updateOne(
          { id: productId },
          {
            $set: {
              parameters: repairResult.nextParameters,
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
      languageCode: options.languageCode,
      productFilter: options.productId,
      limit: options.limit,
      scannedProducts,
      affectedProducts,
      repairedParameters,
      updatedProducts,
      changedProductIds,
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
    console.error('Failed to backfill inferred product parameter language values:', error);
    process.exit(1);
  });
}
