import 'dotenv/config';

import { type Document } from 'mongodb';

import { getCustomFieldRepository } from '@/shared/lib/products/services/custom-field-repository';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import {
  allowedProductCustomFieldNames,
  filterProductCustomFieldValuesByAllowedFieldNames,
  normalizeProductCustomFieldValues,
} from '@/shared/lib/products/utils/custom-field-values';

type CliOptions = {
  dryRun: boolean;
};

type CleanupSummary = {
  matched: number;
  changed: number;
  updated: number;
  skipped: number;
  dryRun: boolean;
};

const parseCliOptions = (): CliOptions => {
  let dryRun = true;

  for (const rawArg of process.argv.slice(2)) {
    if (rawArg === '--write') {
      dryRun = false;
      break;
    }
  }

  return { dryRun };
};

const isEqualCustomFieldArrays = (left: unknown[], right: unknown[]): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

const cleanupProductCustomFields = async (input: { dryRun: boolean }): Promise<CleanupSummary> => {
  const db = await getMongoDb();
  const customFieldRepository = await getCustomFieldRepository();
  const definitions = await customFieldRepository.listCustomFields({});

  const productsCollection = db.collection<Document>('products');
  const cursor = productsCollection.find(
    { customFields: { $exists: true, $ne: [] } },
    { projection: { customFields: 1 } }
  );

  let matched = 0;
  let changed = 0;
  let updated = 0;
  let skipped = 0;

  for await (const product of cursor) {
    matched += 1;
    const sourceCustomFields = normalizeProductCustomFieldValues(product['customFields'] ?? []);
    const sanitizedCustomFields = filterProductCustomFieldValuesByAllowedFieldNames(
      sourceCustomFields,
      definitions,
      allowedProductCustomFieldNames
    );

    if (isEqualCustomFieldArrays(sourceCustomFields, sanitizedCustomFields)) {
      skipped += 1;
      continue;
    }

    changed += 1;
    if (input.dryRun) {
      continue;
    }

    const result = await productsCollection.updateOne(
      { _id: product['_id'] },
      {
        $set: {
          customFields: sanitizedCustomFields,
        },
      }
    );
    updated += result.modifiedCount;
  }

  return {
    matched,
    changed,
    updated,
    skipped,
    dryRun: input.dryRun,
  };
};

const options = parseCliOptions();
const summary = await cleanupProductCustomFields(options);
console.log(
  [
    `Cleanup mode: ${summary.dryRun ? 'dry-run' : 'write'}`,
    `Products scanned: ${summary.matched}`,
    `Products needing cleanup: ${summary.changed}`,
    `Products updated: ${summary.updated}`,
    `Products already compliant: ${summary.skipped}`,
  ].join('\n')
);

