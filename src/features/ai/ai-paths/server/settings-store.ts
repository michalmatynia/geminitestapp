import 'server-only';

import { ObjectId } from 'mongodb';

import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';

export type AiPathsSettingRecord = {
  key: string;
  value: string;
};

type MongoAiPathsSettingDoc = {
  _id?: string | ObjectId;
  key?: string;
  value?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

const AI_PATHS_SETTINGS_COLLECTION = 'ai_paths_settings';
const LEGACY_SETTINGS_COLLECTION = 'settings';
const AI_PATHS_KEY_PREFIX = 'ai_paths_';
const AI_PATHS_PRISMA_PREFIX = 'ai_paths_store:';
const MONGO_INDEX_NAME = 'ai_paths_settings_key';

let mongoIndexesEnsured: Promise<void> | null = null;
let migrationPromise: Promise<void> | null = null;

const canUseMongo = (): boolean => Boolean(process.env['MONGODB_URI']);
const canUsePrisma = (): boolean =>
  Boolean(process.env['DATABASE_URL']) && 'setting' in prisma;

const isAiPathsKey = (key: string): boolean => key.startsWith(AI_PATHS_KEY_PREFIX);

const ensureMongoIndexes = async (): Promise<void> => {
  if (!canUseMongo()) return;
  if (!mongoIndexesEnsured) {
    mongoIndexesEnsured = (async (): Promise<void> => {
      const mongo = await getMongoDb();
      await mongo
        .collection<MongoAiPathsSettingDoc>(AI_PATHS_SETTINGS_COLLECTION)
        .createIndex({ key: 1 }, { unique: true, name: MONGO_INDEX_NAME });
    })();
  }
  await mongoIndexesEnsured;
};

const listMongoAiPathsSettings = async (): Promise<AiPathsSettingRecord[]> => {
  if (!canUseMongo()) return [];
  await ensureMongoIndexes();
  const mongo = await getMongoDb();
  const docs = await mongo
    .collection<MongoAiPathsSettingDoc>(AI_PATHS_SETTINGS_COLLECTION)
    .find({}, { projection: { key: 1, value: 1 } })
    .toArray();

  return docs
    .map((doc: MongoAiPathsSettingDoc): AiPathsSettingRecord | null => {
      const key = typeof doc.key === 'string' ? doc.key : null;
      const value = typeof doc.value === 'string' ? doc.value : null;
      if (!key || value === null) return null;
      return { key, value };
    })
    .filter((item: AiPathsSettingRecord | null): item is AiPathsSettingRecord => Boolean(item));
};

const listPrismaAiPathsSettings = async (): Promise<AiPathsSettingRecord[]> => {
  if (!canUsePrisma()) return [];
  const rows = await prisma.setting.findMany({
    where: { key: { startsWith: AI_PATHS_PRISMA_PREFIX } },
    select: { key: true, value: true },
  });

  return rows
    .map((row): AiPathsSettingRecord | null => {
      if (!row.key.startsWith(AI_PATHS_PRISMA_PREFIX)) return null;
      const key = row.key.slice(AI_PATHS_PRISMA_PREFIX.length);
      if (!key) return null;
      return { key, value: row.value };
    })
    .filter((item: AiPathsSettingRecord | null): item is AiPathsSettingRecord => Boolean(item));
};

const upsertMongoAiPathsSetting = async (
  key: string,
  value: string
): Promise<AiPathsSettingRecord> => {
  await ensureMongoIndexes();
  const mongo = await getMongoDb();
  const now = new Date();
  await mongo.collection<MongoAiPathsSettingDoc>(AI_PATHS_SETTINGS_COLLECTION).updateOne(
    { key },
    {
      $set: { key, value, updatedAt: now },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );
  return { key, value };
};

const upsertPrismaAiPathsSetting = async (
  key: string,
  value: string
): Promise<AiPathsSettingRecord> => {
  const prismaKey = `${AI_PATHS_PRISMA_PREFIX}${key}`;
  await prisma.setting.upsert({
    where: { key: prismaKey },
    update: { value },
    create: { key: prismaKey, value },
    select: { key: true },
  });
  return { key, value };
};

const listLegacyMongoAiPathsSettings = async (): Promise<AiPathsSettingRecord[]> => {
  if (!canUseMongo()) return [];
  const mongo = await getMongoDb();
  const docs = await mongo
    .collection<MongoAiPathsSettingDoc>(LEGACY_SETTINGS_COLLECTION)
    .find(
      {
        $or: [
          { key: { $regex: /^ai_paths_/ } },
          { _id: { $type: 'string', $regex: /^ai_paths_/ } },
        ],
      },
      { projection: { key: 1, value: 1 } }
    )
    .toArray();

  return docs
    .map((doc: MongoAiPathsSettingDoc): AiPathsSettingRecord | null => {
      const key =
        typeof doc.key === 'string'
          ? doc.key
          : typeof doc._id === 'string'
            ? doc._id
            : null;
      const value = typeof doc.value === 'string' ? doc.value : null;
      if (!key || value === null || !isAiPathsKey(key)) return null;
      return { key, value };
    })
    .filter((item: AiPathsSettingRecord | null): item is AiPathsSettingRecord => Boolean(item));
};

const listLegacyPrismaAiPathsSettings = async (): Promise<AiPathsSettingRecord[]> => {
  if (!canUsePrisma()) return [];
  const rows = await prisma.setting.findMany({
    where: { key: { startsWith: AI_PATHS_KEY_PREFIX } },
    select: { key: true, value: true },
  });

  return rows
    .map((row): AiPathsSettingRecord | null => {
      if (!isAiPathsKey(row.key)) return null;
      return { key: row.key, value: row.value };
    })
    .filter((item: AiPathsSettingRecord | null): item is AiPathsSettingRecord => Boolean(item));
};

const ensureMigratedFromLegacy = async (): Promise<void> => {
  if (migrationPromise) {
    await migrationPromise;
    return;
  }

  migrationPromise = (async (): Promise<void> => {
    const existing = canUseMongo()
      ? await listMongoAiPathsSettings()
      : await listPrismaAiPathsSettings();
    if (existing.length > 0) return;

    const [legacyMongo, legacyPrisma] = await Promise.all([
      listLegacyMongoAiPathsSettings(),
      listLegacyPrismaAiPathsSettings(),
    ]);
    const merged = new Map<string, string>();
    legacyPrisma.forEach((entry: AiPathsSettingRecord) => {
      merged.set(entry.key, entry.value);
    });
    legacyMongo.forEach((entry: AiPathsSettingRecord) => {
      merged.set(entry.key, entry.value);
    });
    if (merged.size === 0) return;

    const entries = Array.from(merged.entries()).map(
      ([key, value]): AiPathsSettingRecord => ({ key, value })
    );
    await upsertAiPathsSettingsBulk(entries);
  })();

  try {
    await migrationPromise;
  } finally {
    migrationPromise = null;
  }
};

export async function listAiPathsSettings(): Promise<AiPathsSettingRecord[]> {
  await ensureMigratedFromLegacy();
  return canUseMongo()
    ? await listMongoAiPathsSettings()
    : await listPrismaAiPathsSettings();
}

export async function getAiPathsSetting(
  key: string
): Promise<string | null> {
  const settings = await listAiPathsSettings();
  const match = settings.find((item: AiPathsSettingRecord): boolean => item.key === key);
  return match?.value ?? null;
}

export async function upsertAiPathsSetting(
  key: string,
  value: string
): Promise<AiPathsSettingRecord> {
  if (!isAiPathsKey(key)) {
    throw new Error(`Invalid AI Paths setting key: ${key}`);
  }
  if (canUseMongo()) {
    return await upsertMongoAiPathsSetting(key, value);
  }
  if (!canUsePrisma()) {
    throw new Error('No AI Paths settings store configured.');
  }
  return await upsertPrismaAiPathsSetting(key, value);
}

export async function upsertAiPathsSettingsBulk(
  items: AiPathsSettingRecord[]
): Promise<AiPathsSettingRecord[]> {
  const normalized = items.filter(
    (item: AiPathsSettingRecord): boolean =>
      Boolean(item) &&
      typeof item.key === 'string' &&
      item.key.length > 0 &&
      typeof item.value === 'string' &&
      isAiPathsKey(item.key)
  );
  if (normalized.length === 0) return [];

  if (canUseMongo()) {
    await ensureMongoIndexes();
    const mongo = await getMongoDb();
    const now = new Date();
    const collection = mongo.collection<MongoAiPathsSettingDoc>(
      AI_PATHS_SETTINGS_COLLECTION
    );
    await Promise.all(
      normalized.map((item: AiPathsSettingRecord) =>
        collection.updateOne(
          { key: item.key },
          {
            $set: { key: item.key, value: item.value, updatedAt: now },
            $setOnInsert: { createdAt: now },
          },
          { upsert: true }
        )
      )
    );
    return normalized;
  }

  if (!canUsePrisma()) {
    throw new Error('No AI Paths settings store configured.');
  }

  await Promise.all(
    normalized.map((item: AiPathsSettingRecord) => {
      const prismaKey = `${AI_PATHS_PRISMA_PREFIX}${item.key}`;
      return prisma.setting.upsert({
        where: { key: prismaKey },
        update: { value: item.value },
        create: { key: prismaKey, value: item.value },
        select: { key: true },
      });
    })
  );
  return normalized;
}
