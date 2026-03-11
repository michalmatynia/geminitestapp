import 'dotenv/config';

import fs from 'node:fs';
import path from 'node:path';

import { MongoClient } from 'mongodb';

type FamilySuggestionReport = {
  suggestions: Array<{
    family: string;
    catalogId: string;
    entryCount: number;
    sourcePackPath: string;
    slotLabels: Array<{
      slotId: string;
      slotLabel: string;
      occurrenceCount: number;
      uniqueValuesByLanguage: Record<string, string[]>;
    }>;
    candidateCategories: Array<{
      categoryId: string;
      count: number;
      sampleSkus: string[];
      parameterIds: Array<{
        parameterId: string;
        count: number;
      }>;
    }>;
  }>;
};

type ProductDoc = {
  sku?: string;
  categoryId?: string | null;
  parameters?: Array<{
    parameterId?: string | null;
    value?: string | null;
    valuesByLanguage?: Record<string, string>;
  }> | null;
};

const TYPE_VALUES = new Set([
  'brelok',
  'keychain',
  'pin',
  'odznaka',
  'przypinka',
  'ring',
  'pierścień',
  'pendant',
  'zawieszka',
]);

const MATERIAL_VALUES = new Set([
  'metal',
  'acrylic',
  'akryl',
  'resin',
  'żywica',
  'foam',
  'pianka',
]);

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeForMatch(value: string): string {
  return normalizeString(value).toLowerCase();
}

function isSizeLike(value: string): boolean {
  const normalized = normalizeForMatch(value);
  return /^\d+(?:[.,]\d+)?\s*cm$/.test(normalized) || normalized.includes('adjustable size') || normalized.includes('regulowany rozmiar');
}

function getValueShapeScore(slotLabel: string, value: string): number {
  const normalized = normalizeForMatch(value);
  if (!normalized) return 0;
  if (slotLabel === 'size' && isSizeLike(normalized)) return 2;
  if (slotLabel === 'type' && TYPE_VALUES.has(normalized)) return 2;
  if (slotLabel === 'material' && MATERIAL_VALUES.has(normalized)) return 2;
  return 0;
}

function getOutputPath(reportPath: string): string {
  return path.join(path.dirname(reportPath), `family-slot-mapping-inference-${Date.now()}.json`);
}

async function main(): Promise<void> {
  const reportPathArg = process.argv[2];
  if (!reportPathArg) {
    throw new Error(
      'Usage: node --import tsx scripts/db/infer-product-parameter-slot-mappings.ts <family-mapping-suggestions.json>',
    );
  }

  const reportPath = path.resolve(reportPathArg);
  const report = readJson<FamilySuggestionReport>(reportPath);

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

    const output = {
      generatedAt: new Date().toISOString(),
      sourceSuggestionReportPath: reportPath,
      families: [] as Array<Record<string, unknown>>,
    };

    for (const family of report.suggestions) {
      const topCategory = family.candidateCategories[0];
      if (!topCategory) {
        output.families.push({
          family: family.family,
          catalogId: family.catalogId,
          candidateCategoryId: null,
          slotInference: [],
          notes: ['No candidate category-backed sibling products were found for this family.'],
        });
        continue;
      }

      const docs = await products
        .find(
          {
            sku: { $regex: `^${family.family}` },
            categoryId: topCategory.categoryId,
            parameters: { $type: 'array', $ne: [] },
          },
          {
            projection: {
              sku: 1,
              categoryId: 1,
              parameters: 1,
            },
          },
        )
        .limit(200)
        .toArray();

      const observedByParameterId = new Map<string, Set<string>>();

      for (const doc of docs) {
        for (const parameter of doc.parameters ?? []) {
          const parameterId = normalizeString(parameter?.parameterId);
          if (!parameterId) {
            continue;
          }
          if (!observedByParameterId.has(parameterId)) {
            observedByParameterId.set(parameterId, new Set<string>());
          }
          const bucket = observedByParameterId.get(parameterId)!;
          const localizedEntries = Object.values(parameter?.valuesByLanguage ?? {});
          if (localizedEntries.length > 0) {
            for (const localizedValue of localizedEntries) {
              const normalized = normalizeForMatch(localizedValue);
              if (normalized) bucket.add(normalized);
            }
          }
          const scalarValue = normalizeForMatch(parameter?.value ?? '');
          if (scalarValue) bucket.add(scalarValue);
        }
      }

      const slotInference = family.slotLabels.map((slot) => {
        const targetValues = new Set<string>(
          Object.values(slot.uniqueValuesByLanguage)
            .flat()
            .map((value) => normalizeForMatch(value))
            .filter(Boolean),
        );

        const rankedCandidates = Array.from(observedByParameterId.entries())
          .map(([parameterId, observedValues]) => {
            let overlapCount = 0;
            let shapeScore = 0;
            for (const value of observedValues) {
              if (targetValues.has(value)) {
                overlapCount += 1;
              }
              shapeScore += getValueShapeScore(slot.slotLabel, value);
            }
            return {
              parameterId,
              overlapCount,
              shapeScore,
              observedValueCount: observedValues.size,
              observedValuesSample: Array.from(observedValues).sort().slice(0, 12),
            };
          })
          .sort((left, right) => {
            if (right.overlapCount !== left.overlapCount) return right.overlapCount - left.overlapCount;
            if (right.shapeScore !== left.shapeScore) return right.shapeScore - left.shapeScore;
            if (right.observedValueCount !== left.observedValueCount) return right.observedValueCount - left.observedValueCount;
            return left.parameterId.localeCompare(right.parameterId);
          });

        return {
          slotId: slot.slotId,
          slotLabel: slot.slotLabel,
          targetValues: Array.from(targetValues).sort(),
          rankedCandidates: rankedCandidates.slice(0, 6),
        };
      });

      output.families.push({
        family: family.family,
        catalogId: family.catalogId,
        candidateCategoryId: topCategory.categoryId,
        candidateCategoryCount: topCategory.count,
        sampleSkus: topCategory.sampleSkus,
        slotInference,
      });
    }

    const outputPath = getOutputPath(reportPath);
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + '\n');
    process.stdout.write(`${outputPath}\n`);
  } finally {
    await client.close();
  }
}

void main();
