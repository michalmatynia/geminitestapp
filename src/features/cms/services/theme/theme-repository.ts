/**
 * CMS Theme Repository
 * 
 * Manages raw database operations for CMS theme configurations.
 */

import 'server-only';
import { ObjectId } from 'mongodb';
import type { MongoStringSettingRecord } from '@/shared/contracts/settings';
import { getMongoDb } from '@/shared/lib/db/cms-builder-mongo-client';
import { resolveCmsBuilderMongoSourceConfig } from '@/shared/lib/db/utils/mongo';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';

const toMongoId = (id: string): string | ObjectId => {
  if (ObjectId.isValid(id) && id.length === 24) return new ObjectId(id);
  return id;
};

/**
 * Fetches raw theme settings string from MongoDB.
 */
export const readMongoSetting = async (key: string): Promise<string | null> => {
  const mongodbUri = resolveCmsBuilderMongoSourceConfig('local').uri;
  if (mongodbUri === undefined || mongodbUri === '') return null;
  try {
    const mongo = await getMongoDb();
    const doc = await mongo
      .collection<MongoStringSettingRecord<string | ObjectId>>('settings')
      .findOne({ $or: [{ _id: toMongoId(key) }, { key }] });
    return typeof doc?.value === 'string' ? doc.value : null;
  } catch (error) {
    void ErrorSystem.captureException(error);
    return null;
  }
};
