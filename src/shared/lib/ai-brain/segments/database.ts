import type { MongoStringSettingRecord } from '@/shared/contracts/settings';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { findProviderForKey } from '@/shared/lib/db/settings-registry';

export const readMongoSettingValue = async (key: string): Promise<string | null> => {
  const provider = await findProviderForKey(key);
  if (provider) {
    return await provider.readValue(key);
  }
  if (!process.env['MONGODB_URI']) return null;
  const mongo = await getMongoDb();
  const doc = await mongo
    .collection<MongoStringSettingRecord>('settings')
    .findOne({ $or: [{ _id: key }, { key }] });
  return typeof doc?.value === 'string' ? doc.value : null;
};

export const writeMongoSettingValue = async (key: string, value: string): Promise<boolean> => {
  const provider = await findProviderForKey(key);
  if (provider) {
    return await provider.upsertValue(key, value);
  }
  if (!process.env['MONGODB_URI']) return false;
  const mongo = await getMongoDb();
  await mongo.collection<MongoStringSettingRecord>('settings').updateOne(
    {
      $or: [{ _id: key }, { key }],
    },
    {
      $set: {
        key,
        value,
      },
      $setOnInsert: {
        _id: key,
      },
    },
    { upsert: true }
  );
  return true;
};

export const deleteMongoSettingValue = async (key: string): Promise<boolean> => {
  const provider = await findProviderForKey(key);
  if (provider) {
    return await provider.deleteValue(key);
  }
  if (!process.env['MONGODB_URI']) return false;
  const mongo = await getMongoDb();
  await mongo.collection<MongoStringSettingRecord>('settings').deleteOne({
    $or: [{ _id: key }, { key }],
  });
  return true;
};
