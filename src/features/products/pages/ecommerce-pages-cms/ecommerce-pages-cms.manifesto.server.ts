import 'server-only';

import type { Db } from 'mongodb';

import {
  DEFAULT_LOCALE,
  ensureCmsPagesIndex,
  getCmsPagesCollection,
  isAllowedHref,
  isRecord,
  makeStoredFilename,
  readText,
  validateImageFile,
  withEcommerceMongoDb,
  withMainAppMongoDb,
  writeLocalImageFile,
  type CmsPageDoc,
} from './ecommerce-pages-cms.shared.server';
import { externalServiceError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { resolveEcommerceMongoSourceConfig } from '@/shared/lib/db/utils/mongo';
import { uploadBufferToFastComet } from '@/shared/lib/files/services/storage/file-storage-service';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const HOME_PAGE_KEY = 'home';
const MAX_MANIFESTO_BACKGROUND_BYTES = 8 * 1024 * 1024;
const MANIFESTO_BACKGROUND_PUBLIC_DIR = '/uploads/cms/stargater/manifesto';
const MANIFESTO_BACKGROUND_FASTCOMET_FOLDER = 'stargater/manifesto';

export type EcommercePagesCmsManifestoFields = {
  backgroundImageUrl: string;
  body: string;
  ctaHref: string;
  ctaLabel: string;
  eyebrow: string;
  quoteEmphasis: string;
  quotePrefix: string;
  quoteSuffix: string;
};

export type EcommercePagesCmsManifestoSnapshot = EcommercePagesCmsManifestoFields & {
  cloudConfigured: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
};

export type EcommercePagesCmsManifestoSaveResult = EcommercePagesCmsManifestoSnapshot & {
  cloudMirrored: boolean;
};

export type EcommercePagesCmsManifestoBackgroundUploadResult = {
  filename: string;
  localPublicPath: string;
  mimetype: string;
  remoteUrl: string;
  size: number;
};

const DEFAULT_MANIFESTO_FIELDS: EcommercePagesCmsManifestoFields = {
  backgroundImageUrl: '',
  body:
    'We source and curate officially licensed collectibles from the anime, gaming and film worlds — so every piece in your collection carries real meaning.',
  ctaHref: '/products',
  ctaLabel: 'Explore The Cache',
  eyebrow: 'The Collector\'s Creed',
  quoteEmphasis: 'a piece you can hold',
  quotePrefix: 'Every universe deserves',
  quoteSuffix: '.',
};

const readField = (
  record: Record<string, unknown>,
  key: keyof EcommercePagesCmsManifestoFields,
  fallback: string
): string => (key in record ? readText(record[key]) : fallback);

const readHrefField = (
  record: Record<string, unknown>,
  key: keyof EcommercePagesCmsManifestoFields,
  fallback: string
): string => {
  const value = readField(record, key, fallback);
  return isAllowedHref(value) ? value : fallback;
};

const getManifestoFieldsFromDoc = (doc: CmsPageDoc | null): EcommercePagesCmsManifestoFields => {
  const manifesto = isRecord(doc?.content) && isRecord(doc.content['manifesto'])
    ? doc.content['manifesto']
    : null;
  if (manifesto === null) return DEFAULT_MANIFESTO_FIELDS;
  return {
    backgroundImageUrl: readHrefField(
      manifesto,
      'backgroundImageUrl',
      DEFAULT_MANIFESTO_FIELDS.backgroundImageUrl
    ),
    body: readField(manifesto, 'body', DEFAULT_MANIFESTO_FIELDS.body),
    ctaHref: readHrefField(manifesto, 'ctaHref', DEFAULT_MANIFESTO_FIELDS.ctaHref),
    ctaLabel: readField(manifesto, 'ctaLabel', DEFAULT_MANIFESTO_FIELDS.ctaLabel),
    eyebrow: readField(manifesto, 'eyebrow', DEFAULT_MANIFESTO_FIELDS.eyebrow),
    quoteEmphasis: readField(
      manifesto,
      'quoteEmphasis',
      DEFAULT_MANIFESTO_FIELDS.quoteEmphasis
    ),
    quotePrefix: readField(manifesto, 'quotePrefix', DEFAULT_MANIFESTO_FIELDS.quotePrefix),
    quoteSuffix: readField(manifesto, 'quoteSuffix', DEFAULT_MANIFESTO_FIELDS.quoteSuffix),
  };
};

const toManifestoSnapshot = (
  doc: CmsPageDoc | null
): Omit<EcommercePagesCmsManifestoSnapshot, 'cloudConfigured'> => ({
  ...getManifestoFieldsFromDoc(doc),
  updatedAt: doc?.updatedAt instanceof Date ? doc.updatedAt.toISOString() : null,
  updatedBy: readText(doc?.updatedBy).length > 0 ? readText(doc?.updatedBy) : null,
});

const readManifestoSnapshotFromDb = async (
  db: Db
): Promise<Omit<EcommercePagesCmsManifestoSnapshot, 'cloudConfigured'>> => {
  const collection = getCmsPagesCollection(db);
  await ensureCmsPagesIndex(collection);
  const defaultDoc = await collection.findOne({ page: HOME_PAGE_KEY, locale: DEFAULT_LOCALE });
  return toManifestoSnapshot(defaultDoc);
};

const saveManifestoToDb = async (
  db: Db,
  manifesto: EcommercePagesCmsManifestoFields,
  userId: string,
  now: Date
): Promise<Omit<EcommercePagesCmsManifestoSnapshot, 'cloudConfigured'>> => {
  const collection = getCmsPagesCollection(db);
  await ensureCmsPagesIndex(collection);
  await collection.updateOne(
    { page: HOME_PAGE_KEY, locale: DEFAULT_LOCALE },
    {
      $setOnInsert: {
        page: HOME_PAGE_KEY,
        locale: DEFAULT_LOCALE,
        content: { manifesto },
        createdAt: now,
      },
    },
    { upsert: true }
  );
  await collection.updateMany(
    { page: HOME_PAGE_KEY },
    {
      $set: {
        'content.manifesto.backgroundImageUrl': manifesto.backgroundImageUrl,
        'content.manifesto.body': manifesto.body,
        'content.manifesto.ctaHref': manifesto.ctaHref,
        'content.manifesto.ctaLabel': manifesto.ctaLabel,
        'content.manifesto.eyebrow': manifesto.eyebrow,
        'content.manifesto.quoteEmphasis': manifesto.quoteEmphasis,
        'content.manifesto.quotePrefix': manifesto.quotePrefix,
        'content.manifesto.quoteSuffix': manifesto.quoteSuffix,
        updatedAt: now,
        updatedBy: userId,
      },
    }
  );
  const updatedDoc = await collection.findOne({ page: HOME_PAGE_KEY, locale: DEFAULT_LOCALE });
  return { ...toManifestoSnapshot(updatedDoc), updatedAt: now.toISOString(), updatedBy: userId };
};

const saveManifestoToLocalAndEcommerce = async (
  manifesto: EcommercePagesCmsManifestoFields,
  userId: string
): Promise<EcommercePagesCmsManifestoSaveResult> => {
  const now = new Date();
  const localDb = await getMongoDb('local');
  const localSnapshot = await saveManifestoToDb(localDb, manifesto, userId, now);
  try {
    await withEcommerceMongoDb('local', (db) => saveManifestoToDb(db, manifesto, userId, now));
    await withEcommerceMongoDb('cloud', (db) => saveManifestoToDb(db, manifesto, userId, now));
    await withMainAppMongoDb('cloud', (db) => saveManifestoToDb(db, manifesto, userId, now));
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'products.pages-cms',
      action: 'mirrorManifestoToEcommerceDatabases',
    });
    throw externalServiceError(
      'Collector Creed content was saved locally but could not be mirrored to the ecommerce databases.',
      { cause: error }
    );
  }
  return { ...localSnapshot, cloudConfigured: true, cloudMirrored: true };
};

export const readEcommercePagesCmsManifesto =
  async (): Promise<EcommercePagesCmsManifestoSnapshot> => {
    const localDb = await getMongoDb('local');
    const cloudConfig = resolveEcommerceMongoSourceConfig('cloud');
    return {
      ...(await readManifestoSnapshotFromDb(localDb)),
      cloudConfigured: cloudConfig.configured,
    };
  };

export const saveEcommercePagesCmsManifesto = async (input: {
  manifesto: EcommercePagesCmsManifestoFields;
  userId: string;
}): Promise<EcommercePagesCmsManifestoSaveResult> => {
  const normalized = getManifestoFieldsFromDoc({
    content: { manifesto: input.manifesto },
    locale: DEFAULT_LOCALE,
    page: HOME_PAGE_KEY,
  });
  return saveManifestoToLocalAndEcommerce(normalized, input.userId);
};

export const uploadEcommercePagesCmsManifestoBackground = async (input: {
  file: File;
}): Promise<EcommercePagesCmsManifestoBackgroundUploadResult> => {
  const mimetype = validateImageFile(input.file, {
    emptyMessage: 'Collector Creed background image is empty.',
    maxBytes: MAX_MANIFESTO_BACKGROUND_BYTES,
    maxMessage: 'Collector Creed background image must be 8 MB or smaller.',
    typeMessage: 'Collector Creed background image must be PNG, JPG, WebP, GIF, or SVG.',
  });
  const filename = makeStoredFilename(input.file, mimetype, 'collector-creed-background');
  const localPublicPath = `${MANIFESTO_BACKGROUND_PUBLIC_DIR}/${filename}`;
  const buffer = Buffer.from(await input.file.arrayBuffer());

  await writeLocalImageFile({ buffer, publicPath: localPublicPath });
  const remoteUrl = await uploadBufferToFastComet({
    buffer,
    category: 'cms',
    filename,
    folder: MANIFESTO_BACKGROUND_FASTCOMET_FOLDER,
    mimetype,
    publicPath: localPublicPath,
  });
  return { filename, localPublicPath, mimetype, remoteUrl, size: input.file.size };
};
