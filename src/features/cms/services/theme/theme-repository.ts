/**
 * CMS Theme Repository
 * 
 * Manages raw database operations for CMS theme configurations.
 */

import 'server-only';
import { ObjectId } from 'mongodb';
import type { MongoStringSettingRecord } from '@/shared/contracts/settings';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { applyActiveMongoSourceEnv } from '@/shared/lib/db/mongo-source';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';

const toMongoId = (id: string): string | ObjectId => {
  if (ObjectId.isValid(id) && id.length === 24) return new ObjectId(id);
  return id;
};

/**
 * Fetches raw theme settings string from MongoDB.
 */
export const readMongoSetting = async (key: string): Promise<string | null> => {
  await applyActiveMongoSourceEnv();
  if (!process.env['MONGODB_URI']) return null;
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
