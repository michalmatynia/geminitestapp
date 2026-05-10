/**
 * AI Insights Settings Service
 * 
 * Settings retrieval service for AI insights configuration.
 * Provides:
 * - MongoDB settings integration
 * - Setting value retrieval by key
 * - Error logging for settings access
 * - Null-safe settings handling
 * - Database connection management
 */

import type { MongoStringSettingRecord } from '@/shared/contracts/settings';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


const readMongoSettingValue = async (key: string): Promise<string | null> => {
  const mongoUri = process.env['MONGODB_URI'];
  if (mongoUri === undefined || mongoUri === '') return null;
  const mongo = await getMongoDb();
  const doc = await mongo
    .collection<MongoStringSettingRecord>('settings')
    .findOne({ $or: [{ _id: key }, { key }] });
  return typeof doc?.value === 'string' ? doc.value : null;
};

export const readInsightSettingValue = async (key: string): Promise<string | null> => {
  try {
    return await readMongoSettingValue(key);
  } catch (error) {
    logClientError(error);
    return null;
  }
};

export const parseBooleanSetting = (
  value: string | null | undefined,
  fallback: boolean
): boolean => {
  if (value === null || value === undefined) return fallback;
  return value === 'true' || value === '1';
};

export const parseNumberSetting = (
  value: string | null | undefined,
  fallback: number,
  min: number = 1
): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min) return fallback;
  return parsed;
};
