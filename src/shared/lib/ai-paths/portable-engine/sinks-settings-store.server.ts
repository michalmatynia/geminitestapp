import 'server-only';

import type { MongoTimestampedStringSettingDocument } from '@/shared/contracts/settings';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


const readSettingsRawFromMongo = async (key: string): Promise<string | null> => {
  if (!process.env['MONGODB_URI']) return null;
  try {
    const mongo = await getMongoDb();
    const record = await mongo
      .collection<MongoTimestampedStringSettingDocument>('settings')
      .findOne(
        {
          $or: [{ _id: key }, { key }],
        },
        { projection: { value: 1 } }
      );
    return typeof record?.value === 'string' ? record.value : null;
  } catch (error) {
    void ErrorSystem.captureException(error);
    return null;
  }
};

const writeSettingsRawToMongo = async (key: string, raw: string): Promise<boolean> => {
  if (!process.env['MONGODB_URI']) return false;
  try {
    const mongo = await getMongoDb();
    const now = new Date();
    await mongo.collection<MongoTimestampedStringSettingDocument>('settings').updateOne(
      {
        $or: [{ _id: key }, { key }],
      },
      {
        $set: {
          key,
          value: raw,
          updatedAt: now,
        },
        $setOnInsert: {
          _id: key,
          createdAt: now,
        },
      },
      { upsert: true }
    );
    return true;
  } catch (error) {
    void ErrorSystem.captureException(error);
    return false;
  }
};

export const readSettingsRawByProviderPriority = async (key: string): Promise<string | null> => {
  return readSettingsRawFromMongo(key);
};

export const writeSettingsRawByProviderPriority = async (
  key: string,
  raw: string
): Promise<boolean> => {
  return writeSettingsRawToMongo(key, raw);
};
