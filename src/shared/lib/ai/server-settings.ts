import 'server-only';

import type { MongoStringSettingRecord } from '@/shared/contracts/settings';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const readMongoSettingValue = async (key: string): Promise<string | null> => {
  if (!process.env['MONGODB_URI']) return null;
  const mongo = await getMongoDb();
  const doc = await mongo
    .collection<MongoStringSettingRecord>('settings')
    .findOne({ $or: [{ _id: key }, { key }] });
  return typeof doc?.value === 'string' ? doc.value : null;
};

export async function getSettingValue(key: string): Promise<string | null> {
  try {
    return await readMongoSettingValue(key);
  } catch (err) {
    void ErrorSystem.captureException(err);
    void ErrorSystem.logWarning(`Mongo setting fetch failed for ${key}`, {
      service: 'ai-server-settings',
      key,
      error: err,
    });
  }

  return null;
}
