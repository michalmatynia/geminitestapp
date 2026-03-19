import { ObjectId, type Db } from 'mongodb';

import type {
  ProductValidationPattern,
  ProductValidationSemanticAuditRecord,
  ProductValidationSemanticState,
} from '@/shared/contracts/products';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import {
  getProductValidationSemanticState,
  normalizeProductValidationSemanticAuditRecord,
} from '@/shared/lib/products/utils/validator-semantic-state';

export const PRODUCT_VALIDATION_PATTERNS_COLLECTION = 'product_validation_patterns';

type ProductValidationSemanticMigrationPatternShape = Partial<
  Pick<
    ProductValidationPattern,
    | 'semanticState'
    | 'label'
    | 'target'
    | 'locale'
    | 'regex'
    | 'replacementEnabled'
    | 'replacementValue'
    | 'launchEnabled'
    | 'launchSourceMode'
    | 'launchSourceField'
    | 'launchOperator'
    | 'launchValue'
  >
> & {
  semanticAudit?: unknown;
  semanticAuditHistory?: unknown[] | null;
};

export type ProductValidationPatternSemanticFields = {
  semanticState: ProductValidationSemanticState | null;
  semanticAudit: ProductValidationSemanticAuditRecord | null;
  semanticAuditHistory: ProductValidationSemanticAuditRecord[];
  needsPersistence: boolean;
};

export type ProductValidationPatternSemanticMigrationDoc =
  ProductValidationSemanticMigrationPatternShape & {
    _id: unknown;
  };

export type ProductValidationPatternSemanticMigrationSummary = {
  mode: 'dry-run' | 'write';
  patternFilter: string | 'all';
  limit: number | null;
  scanned: number;
  changed: number;
  writesAttempted: number;
  writesApplied: number;
  writesFailed: number;
  migratedPatternIds: string[];
  failures: Array<{ id: string; message: string }>;
};

const sortSerializableValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => sortSerializableValue(item));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nestedValue]) => [key, sortSerializableValue(nestedValue)])
    );
  }
  return value;
};

const serializeForComparison = (value: unknown): string =>
  JSON.stringify(sortSerializableValue(value ?? null));

const stringifyId = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'bigint' || typeof value === 'boolean') {
    return String(value);
  }
  if (value instanceof ObjectId) return value.toHexString();
  return '[unknown]';
};

export const getNormalizedProductValidationPatternSemanticFields = (
  doc: ProductValidationSemanticMigrationPatternShape
): ProductValidationPatternSemanticFields => {
  const semanticState = getProductValidationSemanticState(doc);
  const semanticAudit = normalizeProductValidationSemanticAuditRecord(doc.semanticAudit);
  const semanticAuditHistory = Array.isArray(doc.semanticAuditHistory)
    ? doc.semanticAuditHistory
        .map((entry) => normalizeProductValidationSemanticAuditRecord(entry))
        .filter((entry): entry is ProductValidationSemanticAuditRecord => entry !== null)
    : [];

  const needsPersistence =
    serializeForComparison(doc.semanticState) !== serializeForComparison(semanticState) ||
    serializeForComparison(doc.semanticAudit) !== serializeForComparison(semanticAudit) ||
    serializeForComparison(doc.semanticAuditHistory ?? []) !==
      serializeForComparison(semanticAuditHistory);

  return {
    semanticState,
    semanticAudit,
    semanticAuditHistory,
    needsPersistence,
  };
};

export const buildProductValidationPatternSemanticMigrationSetPatch = (
  doc: ProductValidationSemanticMigrationPatternShape
): {
  normalized: ProductValidationPatternSemanticFields;
  setPatch: {
    semanticState: ProductValidationSemanticState | null;
    semanticAudit: ProductValidationSemanticAuditRecord | null;
    semanticAuditHistory: ProductValidationSemanticAuditRecord[];
  };
} => {
  const normalized = getNormalizedProductValidationPatternSemanticFields(doc);
  return {
    normalized,
    setPatch: {
      semanticState: normalized.semanticState,
      semanticAudit: normalized.semanticAudit,
      semanticAuditHistory: normalized.semanticAuditHistory,
    },
  };
};

const buildMigrationFilter = (patternId: string | null): Record<string, unknown> => {
  if (!patternId) return {};
  if (!ObjectId.isValid(patternId)) {
    throw new Error(`Invalid pattern id "${patternId}". Expected a Mongo ObjectId.`);
  }
  return { _id: new ObjectId(patternId) };
};

export const migrateProductValidationPatternSemanticsToLatest = async ({
  dryRun,
  limit = null,
  patternId = null,
  db,
}: {
  dryRun: boolean;
  limit?: number | null;
  patternId?: string | null;
  db?: Db;
}): Promise<ProductValidationPatternSemanticMigrationSummary> => {
  const database = db ?? (await getMongoDb());
  const collection = database.collection<ProductValidationPatternSemanticMigrationDoc>(
    PRODUCT_VALIDATION_PATTERNS_COLLECTION
  );
  const summary: ProductValidationPatternSemanticMigrationSummary = {
    mode: dryRun ? 'dry-run' : 'write',
    patternFilter: patternId ?? 'all',
    limit,
    scanned: 0,
    changed: 0,
    writesAttempted: 0,
    writesApplied: 0,
    writesFailed: 0,
    migratedPatternIds: [],
    failures: [],
  };

  const cursor = collection.find(buildMigrationFilter(patternId), {
    projection: {
      semanticState: 1,
      semanticAudit: 1,
      semanticAuditHistory: 1,
      label: 1,
      target: 1,
      locale: 1,
      regex: 1,
      replacementEnabled: 1,
      replacementValue: 1,
      launchEnabled: 1,
      launchSourceMode: 1,
      launchSourceField: 1,
      launchOperator: 1,
      launchValue: 1,
    },
  });

  for await (const doc of cursor) {
    summary.scanned += 1;
    const { normalized, setPatch } = buildProductValidationPatternSemanticMigrationSetPatch(doc);
    if (!normalized.needsPersistence) continue;

    summary.changed += 1;
    summary.migratedPatternIds.push(stringifyId(doc._id));

    if (dryRun) {
      if (limit && summary.changed >= limit) break;
      continue;
    }

    summary.writesAttempted += 1;
    try {
      await collection.updateOne({ _id: doc._id }, { $set: setPatch });
      summary.writesApplied += 1;
    } catch (error) {
      summary.writesFailed += 1;
      summary.failures.push({
        id: stringifyId(doc._id),
        message: error instanceof Error ? error.message : String(error),
      });
    }

    if (limit && summary.changed >= limit) break;
  }

  return summary;
};
