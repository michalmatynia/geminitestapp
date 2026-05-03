import 'server-only';

import type { MongoStringSettingRecord } from '@/shared/contracts/settings';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { isTransientMongoConnectionError } from '@/shared/lib/db/utils/mongo';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const readMongoSettingValue = async (key: string): Promise<string | null> => {
  const mongoUri = process.env['MONGODB_URI'];
  if (typeof mongoUri !== 'string' || mongoUri.trim().length === 0) return null;
  const mongo: unknown = await getMongoDb();
  if (
    typeof mongo !== 'object' ||
    mongo === null ||
    typeof (mongo as { collection?: unknown }).collection !== 'function'
  ) {
    return null;
  }
  const db = mongo as Awaited<ReturnType<typeof getMongoDb>>;
  const doc = await db
    .collection<MongoStringSettingRecord>('settings')
    .findOne({ $or: [{ _id: key }, { key }] });
  return typeof doc?.value === 'string' ? doc.value : null;
};

export async function getSettingValue(key: string): Promise<string | null> {
  try {
    return await readMongoSettingValue(key);
  } catch (err) {
    if (isTransientMongoConnectionError(err)) {
      return null;
    }
    Promise.resolve(ErrorSystem.captureException(err)).catch(() => undefined);
    Promise.resolve(
      ErrorSystem.logWarning(`Mongo setting fetch failed for ${key}`, {
        service: 'ai-server-settings',
        key,
        error: err,
      })
    ).catch(() => undefined);
  }

  return null;
}
