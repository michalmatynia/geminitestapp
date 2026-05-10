import 'server-only';

import type { Db } from 'mongodb';

import {
  DEFAULT_LOCALE,
  ensureCmsPagesIndex,
  getCmsPagesCollection,
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

const SITE_PAGE_KEY = 'site';
const MAX_LOGO_BYTES = 3 * 1024 * 1024;
const LOGO_PUBLIC_DIR = '/uploads/cms/stargater/logo';
const LOGO_FASTCOMET_FOLDER = 'stargater/logo';

type SiteLogoFields = {
  logoUrl: string;
  logoAlt: string;
};

type SiteLogoSnapshot = SiteLogoFields & {
  updatedAt: string | null;
  updatedBy: string | null;
};

export type EcommercePagesCmsLogoSnapshot = SiteLogoSnapshot & {
  cloudConfigured: boolean;
};

export type EcommercePagesCmsLogoUploadResult = EcommercePagesCmsLogoSnapshot & {
  cloudMirrored: boolean;
  filename: string;
  localPublicPath: string;
  mimetype: string;
  remoteUrl: string;
  size: number;
};

const getLogoFieldsFromDoc = (doc: CmsPageDoc | null): SiteLogoFields => {
  if (!isRecord(doc?.content)) return { logoUrl: '', logoAlt: '' };
  const nav = doc.content['nav'];
  if (!isRecord(nav)) return { logoUrl: '', logoAlt: '' };
  return {
    logoUrl: readText(nav['logoUrl']),
    logoAlt: readText(nav['logoAlt']),
  };
};

const toLogoSnapshot = (doc: CmsPageDoc | null): SiteLogoSnapshot => ({
  ...getLogoFieldsFromDoc(doc),
  updatedAt: doc?.updatedAt instanceof Date ? doc.updatedAt.toISOString() : null,
  updatedBy: readText(doc?.updatedBy).length > 0 ? readText(doc?.updatedBy) : null,
});

const readLogoSnapshotFromDb = async (db: Db): Promise<SiteLogoSnapshot> => {
  const collection = getCmsPagesCollection(db);
  await ensureCmsPagesIndex(collection);
  const defaultDoc = await collection.findOne({ page: SITE_PAGE_KEY, locale: DEFAULT_LOCALE });
  if (defaultDoc !== null) return toLogoSnapshot(defaultDoc);

  const docs = await collection.find({ page: SITE_PAGE_KEY }).toArray();
  const logoDoc = docs.find((doc) => {
    const logo = getLogoFieldsFromDoc(doc);
    return logo.logoUrl.length > 0 || logo.logoAlt.length > 0;
  });
  return toLogoSnapshot(logoDoc ?? null);
};

const saveLogoToDb = async (
  db: Db,
  logo: SiteLogoFields,
  userId: string,
  now: Date
): Promise<SiteLogoSnapshot> => {
  const collection = getCmsPagesCollection(db);
  await ensureCmsPagesIndex(collection);

  await collection.updateOne(
    { page: SITE_PAGE_KEY, locale: DEFAULT_LOCALE },
    {
      $setOnInsert: {
        page: SITE_PAGE_KEY,
        locale: DEFAULT_LOCALE,
        content: { nav: { logoUrl: logo.logoUrl, logoAlt: logo.logoAlt } },
        createdAt: now,
      },
    },
    { upsert: true }
  );

  await collection.updateMany(
    { page: SITE_PAGE_KEY },
    {
      $set: {
        'content.nav.logoUrl': logo.logoUrl,
        'content.nav.logoAlt': logo.logoAlt,
        updatedAt: now,
        updatedBy: userId,
      },
    }
  );

  const updatedDoc = await collection.findOne({ page: SITE_PAGE_KEY, locale: DEFAULT_LOCALE });
  return {
    ...toLogoSnapshot(updatedDoc),
    updatedAt: now.toISOString(),
    updatedBy: userId,
  };
};

const saveLogoToLocalAndEcommerce = async (
  logo: SiteLogoFields,
  userId: string
): Promise<EcommercePagesCmsLogoSnapshot> => {
  const now = new Date();
  const localDb = await getMongoDb('local');
  const localSnapshot = await saveLogoToDb(localDb, logo, userId, now);

  try {
    await withEcommerceMongoDb('local', (db) => saveLogoToDb(db, logo, userId, now));
    await withEcommerceMongoDb('cloud', (db) => saveLogoToDb(db, logo, userId, now));
    await withMainAppMongoDb('cloud', (db) => saveLogoToDb(db, logo, userId, now));
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'products.pages-cms',
      action: 'mirrorLogoToEcommerceDatabases',
    });
    throw externalServiceError(
      'Logo was saved locally but could not be mirrored to the ecommerce databases.',
      { cause: error }
    );
  }

  return { ...localSnapshot, cloudConfigured: true };
};

const validateLogoFile = (file: File): string =>
  validateImageFile(file, {
    emptyMessage: 'Logo file is empty.',
    maxBytes: MAX_LOGO_BYTES,
    maxMessage: 'Logo file must be 3 MB or smaller.',
    typeMessage: 'Logo must be PNG, JPG, WebP, GIF, or SVG.',
  });

export const readEcommercePagesCmsLogo = async (): Promise<EcommercePagesCmsLogoSnapshot> => {
  const localDb = await getMongoDb('local');
  const cloudConfig = resolveEcommerceMongoSourceConfig('cloud');
  return {
    ...(await readLogoSnapshotFromDb(localDb)),
    cloudConfigured: cloudConfig.configured,
  };
};

export const uploadEcommercePagesCmsLogo = async (input: {
  file: File;
  logoAlt: string;
  userId: string;
}): Promise<EcommercePagesCmsLogoUploadResult> => {
  const mimetype = validateLogoFile(input.file);
  const filename = makeStoredFilename(input.file, mimetype);
  const localPublicPath = `${LOGO_PUBLIC_DIR}/${filename}`;
  const buffer = Buffer.from(await input.file.arrayBuffer());

  await writeLocalImageFile({ buffer, publicPath: localPublicPath });
  const remoteUrl = await uploadBufferToFastComet({
    buffer,
    category: 'cms',
    filename,
    folder: LOGO_FASTCOMET_FOLDER,
    mimetype,
    publicPath: localPublicPath,
  });
  const snapshot = await saveLogoToLocalAndEcommerce({
    logoAlt: input.logoAlt.trim(),
    logoUrl: remoteUrl,
  }, input.userId);

  return {
    ...snapshot,
    cloudMirrored: true,
    filename,
    localPublicPath,
    mimetype,
    remoteUrl,
    size: input.file.size,
  };
};
