import 'server-only';

import type { Db } from 'mongodb';

import {
  DEFAULT_LOCALE,
  ensureCmsPagesIndex,
  getCmsPagesCollection,
  isRecord,
  readBoolean,
  readText,
  withEcommerceMongoDb,
  withMainAppMongoDb,
  type CmsPageDoc,
} from './ecommerce-pages-cms.shared.server';
import { externalServiceError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { resolveEcommerceMongoSourceConfig } from '@/shared/lib/db/utils/mongo';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const SITE_PAGE_KEY = 'site';

export type EcommercePagesCmsBackgroundFields = {
  cosmosParallaxEnabled: boolean;
};

export type EcommercePagesCmsBackgroundSnapshot = EcommercePagesCmsBackgroundFields & {
  cloudConfigured: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
};

export type EcommercePagesCmsBackgroundSaveResult = EcommercePagesCmsBackgroundSnapshot & {
  cloudMirrored: boolean;
};

const DEFAULT_BACKGROUND_FIELDS: EcommercePagesCmsBackgroundFields = {
  cosmosParallaxEnabled: true,
};

const getBackgroundFieldsFromDoc = (doc: CmsPageDoc | null): EcommercePagesCmsBackgroundFields => {
  if (!isRecord(doc?.content)) return DEFAULT_BACKGROUND_FIELDS;
  const background = doc.content['background'];
  if (!isRecord(background)) return DEFAULT_BACKGROUND_FIELDS;
  return {
    cosmosParallaxEnabled: readBoolean(
      background['cosmosParallaxEnabled'],
      DEFAULT_BACKGROUND_FIELDS.cosmosParallaxEnabled
    ),
  };
};

const toBackgroundSnapshot = (
  doc: CmsPageDoc | null
): Omit<EcommercePagesCmsBackgroundSnapshot, 'cloudConfigured'> => ({
  ...getBackgroundFieldsFromDoc(doc),
  updatedAt: doc?.updatedAt instanceof Date ? doc.updatedAt.toISOString() : null,
  updatedBy: readText(doc?.updatedBy).length > 0 ? readText(doc?.updatedBy) : null,
});

const readBackgroundSnapshotFromDb = async (
  db: Db
): Promise<Omit<EcommercePagesCmsBackgroundSnapshot, 'cloudConfigured'>> => {
  const collection = getCmsPagesCollection(db);
  await ensureCmsPagesIndex(collection);
  const defaultDoc = await collection.findOne({ page: SITE_PAGE_KEY, locale: DEFAULT_LOCALE });
  return toBackgroundSnapshot(defaultDoc);
};

const saveBackgroundToDb = async (
  db: Db,
  background: EcommercePagesCmsBackgroundFields,
  userId: string,
  now: Date
): Promise<Omit<EcommercePagesCmsBackgroundSnapshot, 'cloudConfigured'>> => {
  const collection = getCmsPagesCollection(db);
  await ensureCmsPagesIndex(collection);

  await collection.updateOne(
    { page: SITE_PAGE_KEY, locale: DEFAULT_LOCALE },
    {
      $setOnInsert: {
        page: SITE_PAGE_KEY,
        locale: DEFAULT_LOCALE,
        content: { background },
        createdAt: now,
      },
    },
    { upsert: true }
  );

  await collection.updateMany(
    { page: SITE_PAGE_KEY },
    {
      $set: {
        'content.background.cosmosParallaxEnabled': background.cosmosParallaxEnabled,
        updatedAt: now,
        updatedBy: userId,
      },
    }
  );

  const updatedDoc = await collection.findOne({ page: SITE_PAGE_KEY, locale: DEFAULT_LOCALE });
  return {
    ...toBackgroundSnapshot(updatedDoc),
    updatedAt: now.toISOString(),
    updatedBy: userId,
  };
};

const saveBackgroundToLocalAndEcommerce = async (
  background: EcommercePagesCmsBackgroundFields,
  userId: string
): Promise<EcommercePagesCmsBackgroundSaveResult> => {
  const now = new Date();
  const localDb = await getMongoDb('local');
  const localSnapshot = await saveBackgroundToDb(localDb, background, userId, now);

  try {
    await withEcommerceMongoDb('local', (db) => saveBackgroundToDb(db, background, userId, now));
    await withEcommerceMongoDb('cloud', (db) => saveBackgroundToDb(db, background, userId, now));
    await withMainAppMongoDb('cloud', (db) => saveBackgroundToDb(db, background, userId, now));
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'products.pages-cms',
      action: 'mirrorBackgroundToEcommerceDatabases',
    });
    throw externalServiceError(
      'Background settings were saved locally but could not be mirrored to the ecommerce databases.',
      { cause: error }
    );
  }

  return { ...localSnapshot, cloudConfigured: true, cloudMirrored: true };
};

export const readEcommercePagesCmsBackground =
  async (): Promise<EcommercePagesCmsBackgroundSnapshot> => {
    const localDb = await getMongoDb('local');
    const cloudConfig = resolveEcommerceMongoSourceConfig('cloud');
    return {
      ...(await readBackgroundSnapshotFromDb(localDb)),
      cloudConfigured: cloudConfig.configured,
    };
  };

export const saveEcommercePagesCmsBackground = async (input: {
  background: EcommercePagesCmsBackgroundFields;
  userId: string;
}): Promise<EcommercePagesCmsBackgroundSaveResult> =>
  saveBackgroundToLocalAndEcommerce(
    {
      cosmosParallaxEnabled:
        input.background.cosmosParallaxEnabled === true,
    },
    input.userId
  );
