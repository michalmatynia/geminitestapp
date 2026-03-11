import 'dotenv/config';

import fs from 'node:fs';
import path from 'node:path';

import { MongoClient } from 'mongodb';

type MappingIndex = {
  families: Array<{
    family: string;
    catalogId: string;
    entryCount: number;
    sourceBatchPath: string;
    sourcePackPath: string;
    slots: Array<{
      slotId: string;
      slotLabel: string;
      occurrenceCount: number;
      uniqueValuesByLanguage: Record<string, string[]>;
    }>;
  }>;
};

type ProductDoc = {
  _id?: unknown;
  sku?: string;
  categoryId?: string | null;
  category?: string | null;
  name_en?: string | null;
  name_pl?: string | null;
  parameters?: Array<{
    parameterId?: string | null;
    value?: string | null;
    valuesByLanguage?: Record<string, string>;
  }> | null;
};

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function timestamp(): string {
  return Date.now().toString();
}

function getOutputPath(indexPath: string): string {
  return path.join(path.dirname(indexPath), `family-mapping-suggestions-${timestamp()}.json`);
}

async function main(): Promise<void> {
  const indexPathArg = process.argv[2];
  if (!indexPathArg) {
    throw new Error(
      'Usage: node --import tsx scripts/db/suggest-product-parameter-family-mappings.ts <family-mapping-index.json>',
    );
  }

  const indexPath = path.resolve(indexPathArg);
  const index = readJson<MappingIndex>(indexPath);

  const uri = process.env['MONGODB_URI']?.trim();
  if (!uri) {
    throw new Error('MONGODB_URI is required');
  }
  const dbName = process.env['MONGODB_DB']?.trim() || 'app';

  const client = new MongoClient(uri);
  await client.connect();

  try {
    const db = client.db(dbName);
    const products = db.collection<ProductDoc>('products');

    const suggestions = [];

    for (const family of index.families) {
      const docs = await products
        .find(
          {
            sku: { $regex: `^${family.family}` },
            categoryId: { $type: 'string', $ne: '' },
            parameters: { $type: 'array', $ne: [] },
          },
          {
            projection: {
              sku: 1,
              categoryId: 1,
              category: 1,
              name_en: 1,
              name_pl: 1,
              parameters: 1,
            },
          },
        )
        .limit(100)
        .toArray();

      const categories = new Map<
        string,
        {
          categoryId: string;
          count: number;
          sampleSkus: string[];
          parameterIds: Map<string, number>;
        }
      >();

      for (const doc of docs) {
        const categoryId = normalizeString(doc.categoryId);
        if (!categoryId) {
          continue;
        }
        if (!categories.has(categoryId)) {
          categories.set(categoryId, {
            categoryId,
            count: 0,
            sampleSkus: [],
            parameterIds: new Map<string, number>(),
          });
        }
        const bucket = categories.get(categoryId)!;
        bucket.count += 1;
        const sku = normalizeString(doc.sku);
        if (sku && bucket.sampleSkus.length < 10 && !bucket.sampleSkus.includes(sku)) {
          bucket.sampleSkus.push(sku);
        }
        for (const parameter of doc.parameters ?? []) {
          const parameterId = normalizeString(parameter?.parameterId);
          if (!parameterId) {
            continue;
          }
          bucket.parameterIds.set(parameterId, (bucket.parameterIds.get(parameterId) ?? 0) + 1);
        }
      }

      suggestions.push({
        family: family.family,
        catalogId: family.catalogId,
        entryCount: family.entryCount,
        sourcePackPath: family.sourcePackPath,
        slotLabels: family.slots.map((slot) => ({
          slotId: slot.slotId,
          slotLabel: slot.slotLabel,
          occurrenceCount: slot.occurrenceCount,
          uniqueValuesByLanguage: slot.uniqueValuesByLanguage,
        })),
        candidateCategories: Array.from(categories.values())
          .sort((left, right) => right.count - left.count || left.categoryId.localeCompare(right.categoryId))
          .map((bucket) => ({
            categoryId: bucket.categoryId,
            count: bucket.count,
            sampleSkus: bucket.sampleSkus,
            parameterIds: Array.from(bucket.parameterIds.entries())
              .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
              .map(([parameterId, count]) => ({ parameterId, count })),
          })),
      });
    }

    const output = {
      generatedAt: new Date().toISOString(),
      sourceIndexPath: indexPath,
      familyCount: suggestions.length,
      suggestions,
    };

    const outputPath = getOutputPath(indexPath);
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + '\n');
    process.stdout.write(`${outputPath}\n`);
  } finally {
    await client.close();
  }
}

void main();
