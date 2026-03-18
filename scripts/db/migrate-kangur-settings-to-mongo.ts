import 'dotenv/config';

import { getMongoClient, getMongoDb } from '@/shared/lib/db/mongo-client';

const LEGACY_SETTINGS_COLLECTION = 'settings';
const KANGUR_SETTINGS_COLLECTION = 'kangur_settings';
const KANGUR_SETTINGS_KEY_PREFIX = 'kangur_';
const KANGUR_SETTINGS_KEY_INDEX = 'kangur_settings_key';

const shouldApply = process.argv.includes('--apply');
const shouldDeleteLegacy = process.argv.includes('--delete-legacy');

type LegacySettingDoc = {
  _id?: string;
  key?: string;
  value?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

type KangurSettingDoc = {
  _id?: string;
  key?: string;
  value?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

const resolveKey = (doc: LegacySettingDoc): string | null => {
  if (typeof doc.key === 'string' && doc.key.trim().length > 0) {
    return doc.key;
  }
  if (typeof doc._id === 'string' && doc._id.trim().length > 0) {
    return doc._id;
  }
  return null;
};

const normalizeDate = (value: Date | string | undefined, fallback: Date): Date => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return fallback;
};

async function main(): Promise<void> {
  if (!process.env['MONGODB_URI']) {
    throw new Error('MONGODB_URI is required to migrate Kangur settings.');
  }

  if (shouldDeleteLegacy && !shouldApply) {
    process.stdout.write(
      'Ignoring --delete-legacy because --apply was not set. Use --apply to persist changes.\n'
    );
  }

  const client = await getMongoClient();
  try {
    const db = await getMongoDb();
    const legacyCollection = db.collection<LegacySettingDoc>(LEGACY_SETTINGS_COLLECTION);
    const kangurCollection = db.collection<KangurSettingDoc>(KANGUR_SETTINGS_COLLECTION);

    const legacyDocs = await legacyCollection
      .find({
        $or: [
          { key: { $regex: `^${KANGUR_SETTINGS_KEY_PREFIX}` } },
          { _id: { $type: 'string', $regex: `^${KANGUR_SETTINGS_KEY_PREFIX}` } },
        ],
      })
      .toArray();

    const uniqueByKey = new Map<string, LegacySettingDoc>();
    legacyDocs.forEach((doc) => {
      const key = resolveKey(doc);
      if (!key) return;
      uniqueByKey.set(key, doc);
    });

    if (shouldApply) {
      await kangurCollection.createIndex(
        { key: 1 },
        { name: KANGUR_SETTINGS_KEY_INDEX, unique: true }
      );

      const now = new Date();
      const operations = Array.from(uniqueByKey.entries()).map(([key, doc]) => {
        const createdAt = normalizeDate(doc.createdAt, now);
        const updatedAt = normalizeDate(doc.updatedAt, createdAt);
        return {
          updateOne: {
            filter: { $or: [{ _id: key }, { key }] },
            update: {
              $set: { key, value: doc.value ?? '', updatedAt },
              $setOnInsert: { _id: key, createdAt },
            },
            upsert: true,
          },
        };
      });

      if (operations.length > 0) {
        await kangurCollection.bulkWrite(operations, { ordered: false });
      }

      if (shouldDeleteLegacy && operations.length > 0) {
        await legacyCollection.deleteMany({
          $or: [
            { key: { $in: Array.from(uniqueByKey.keys()) } },
            { _id: { $in: Array.from(uniqueByKey.keys()) } },
          ],
        });
      }
    }

    console.log(
      JSON.stringify(
        {
          mode: shouldApply ? 'apply' : 'dry-run',
          deleteLegacy: shouldApply && shouldDeleteLegacy,
          legacyKeys: legacyDocs.length,
          uniqueKeys: uniqueByKey.size,
        },
        null,
        2
      )
    );
  } finally {
    await client.close();
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
