import 'server-only';

import { randomUUID } from 'crypto';

import type { ProductValidationDenyBehavior } from '@/shared/contracts/products/validation';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { PRODUCT_VALIDATOR_DECISION_LOG_SETTING_KEY } from '@/shared/lib/products/constants';
import { getProductDataProvider } from '@/shared/lib/products/services/product-provider';

import type { Document, Filter } from 'mongodb';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


type ProductValidationDecisionAction = 'deny' | 'replace' | 'accept';

export type ProductValidationDecisionRecord = {
  id: string;
  action: ProductValidationDecisionAction;
  productId: string | null;
  draftId: string | null;
  patternId: string;
  fieldName: string;
  denyBehavior: ProductValidationDenyBehavior | null;
  message: string | null;
  replacementValue: string | null;
  sessionId: string | null;
  userId: string | null;
  createdAt: string;
};

type AppendProductValidationDecisionInput = {
  action: ProductValidationDecisionAction;
  productId?: string | null;
  draftId?: string | null;
  patternId: string;
  fieldName: string;
  denyBehavior?: ProductValidationDenyBehavior | null;
  message?: string | null;
  replacementValue?: string | null;
  sessionId?: string | null;
  userId?: string | null;
};

const DECISION_LOG_MAX_ENTRIES = 2_000;

const parseDecisionLog = (value: string | null): ProductValidationDecisionRecord[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry: unknown): entry is ProductValidationDecisionRecord =>
        Boolean(
          entry &&
          typeof entry === 'object' &&
          typeof (entry as Record<string, unknown>)['id'] === 'string' &&
          typeof (entry as Record<string, unknown>)['patternId'] === 'string' &&
          typeof (entry as Record<string, unknown>)['fieldName'] === 'string'
        )
      )
      .slice(0, DECISION_LOG_MAX_ENTRIES);
  } catch (error) {
    void ErrorSystem.captureException(error);
    return [];
  }
};

const toMongoSettingFilter = (key: string): Filter<Document> =>
  ({
    $or: [{ _id: key }, { key }],
  }) as Filter<Document>;

const readDecisionLogValue = async (): Promise<string | null> => {
  await getProductDataProvider();
  const mongo = await getMongoDb();
  const doc = await mongo
    .collection('settings')
    .findOne(toMongoSettingFilter(PRODUCT_VALIDATOR_DECISION_LOG_SETTING_KEY));
  return doc && typeof doc['value'] === 'string' ? doc['value'] : null;
};

const writeDecisionLogValue = async (value: string): Promise<void> => {
  await getProductDataProvider();
  const mongo = await getMongoDb();
  await mongo.collection('settings').updateOne(
    toMongoSettingFilter(PRODUCT_VALIDATOR_DECISION_LOG_SETTING_KEY),
    {
      $set: {
        key: PRODUCT_VALIDATOR_DECISION_LOG_SETTING_KEY,
        value,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );
};

const normalizeTrimmedString = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export async function appendProductValidationDecision(
  input: AppendProductValidationDecisionInput
): Promise<ProductValidationDecisionRecord> {
  const existing = parseDecisionLog(await readDecisionLogValue());
  const record: ProductValidationDecisionRecord = {
    id:
      typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function'
        ? globalThis.crypto.randomUUID()
        : randomUUID(),
    action: input.action,
    productId: normalizeTrimmedString(input.productId ?? null),
    draftId: normalizeTrimmedString(input.draftId ?? null),
    patternId: input.patternId.trim(),
    fieldName: input.fieldName.trim(),
    denyBehavior: input.denyBehavior ?? null,
    message: normalizeTrimmedString(input.message ?? null),
    replacementValue: normalizeTrimmedString(input.replacementValue ?? null),
    sessionId: normalizeTrimmedString(input.sessionId ?? null),
    userId: normalizeTrimmedString(input.userId ?? null),
    createdAt: new Date().toISOString(),
  };

  const next = [record, ...existing].slice(0, DECISION_LOG_MAX_ENTRIES);
  await writeDecisionLogValue(JSON.stringify(next));
  return record;
}

export async function appendProductValidationDecisionsBatch(
  inputs: AppendProductValidationDecisionInput[]
): Promise<ProductValidationDecisionRecord[]> {
  const existing = parseDecisionLog(await readDecisionLogValue());
  const now = new Date().toISOString();
  const records: ProductValidationDecisionRecord[] = inputs.map(
    (input): ProductValidationDecisionRecord => ({
      id:
        typeof globalThis.crypto !== 'undefined' &&
        typeof globalThis.crypto.randomUUID === 'function'
          ? globalThis.crypto.randomUUID()
          : randomUUID(),
      action: input.action,
      productId: normalizeTrimmedString(input.productId ?? null),
      draftId: normalizeTrimmedString(input.draftId ?? null),
      patternId: input.patternId.trim(),
      fieldName: input.fieldName.trim(),
      denyBehavior: input.denyBehavior ?? null,
      message: normalizeTrimmedString(input.message ?? null),
      replacementValue: normalizeTrimmedString(input.replacementValue ?? null),
      sessionId: normalizeTrimmedString(input.sessionId ?? null),
      userId: normalizeTrimmedString(input.userId ?? null),
      createdAt: now,
    })
  );

  const next = [...records, ...existing].slice(0, DECISION_LOG_MAX_ENTRIES);
  await writeDecisionLogValue(JSON.stringify(next));
  return records;
}
