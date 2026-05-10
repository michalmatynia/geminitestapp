import 'server-only';

import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import { MongoClient, type Collection, type Db, type MongoClientOptions } from 'mongodb';

import type { MongoSource } from '@/shared/contracts/database';
import { badRequestError, configurationError } from '@/shared/errors/app-error';
import { resolveMongoSourceConfig } from '@/shared/lib/db/mongo-source';
import { resolveEcommerceMongoSourceConfig } from '@/shared/lib/db/utils/mongo';
import { getDiskPathFromPublicPath } from '@/shared/lib/files/services/image-file-service';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

export const CMS_PAGES_COLLECTION = 'ecom_cms_pages';
export const DEFAULT_LOCALE = 'en';

export type CmsPageDoc = {
  page: string;
  locale: string;
  content?: unknown;
  createdAt?: Date;
  updatedAt?: Date;
  updatedBy?: string;
};

const MIME_TO_EXTENSION = new Map<string, string>([
  ['image/png', 'png'],
  ['image/jpeg', 'jpg'],
  ['image/webp', 'webp'],
  ['image/gif', 'gif'],
  ['image/svg+xml', 'svg'],
]);

const EXTENSION_TO_MIME = new Map<string, string>([
  ['png', 'image/png'],
  ['jpg', 'image/jpeg'],
  ['jpeg', 'image/jpeg'],
  ['webp', 'image/webp'],
  ['gif', 'image/gif'],
  ['svg', 'image/svg+xml'],
]);

export type ImageValidationOptions = {
  emptyMessage: string;
  maxBytes: number;
  maxMessage: string;
  typeMessage: string;
};

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export const readText = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

export const readBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback;

export const readStringList = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.map((item) => readText(item)).filter((item) => item.length > 0)
    : [];

export const isAllowedHref = (value: string): boolean => {
  if (value.length === 0) return true;
  if (value.startsWith('/') && !value.startsWith('//')) return true;
  if (value.startsWith('#')) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const getExtension = (filename: string): string => {
  const match = /\.([a-z0-9]+)$/i.exec(filename.trim());
  return match?.[1]?.toLowerCase() ?? '';
};

const getImageMime = (file: File): string | null => {
  const type = file.type.trim().toLowerCase();
  if (MIME_TO_EXTENSION.has(type)) return type;
  return EXTENSION_TO_MIME.get(getExtension(file.name)) ?? null;
};

const sanitizeName = (filename: string, fallback: string): string => {
  const normalized = filename.replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return normalized.length > 0 ? normalized : fallback;
};

export const makeStoredFilename = (
  file: File,
  mimetype: string,
  fallbackName = 'logo'
): string => {
  const extension = MIME_TO_EXTENSION.get(mimetype) ?? 'png';
  return `${Date.now()}-${randomUUID().slice(0, 8)}-${sanitizeName(file.name, fallbackName)}.${extension}`;
};

export const validateImageFile = (file: File, options: ImageValidationOptions): string => {
  if (file.size <= 0) throw badRequestError(options.emptyMessage);
  if (file.size > options.maxBytes) throw badRequestError(options.maxMessage);
  const mimetype = getImageMime(file);
  if (mimetype === null) throw badRequestError(options.typeMessage);
  return mimetype;
};

export const writeLocalImageFile = async (input: {
  buffer: Buffer;
  publicPath: string;
}): Promise<void> => {
  const diskPath = getDiskPathFromPublicPath(input.publicPath);
  await fs.mkdir(path.dirname(diskPath), { recursive: true });
  await fs.writeFile(diskPath, input.buffer);
};

export const getCmsPagesCollection = (db: Db): Collection<CmsPageDoc> =>
  db.collection<CmsPageDoc>(CMS_PAGES_COLLECTION);

export const ensureCmsPagesIndex = async (
  collection: Collection<CmsPageDoc>
): Promise<void> => {
  await collection.createIndex({ page: 1, locale: 1 }, { unique: true }).catch((error: unknown) => {
    void ErrorSystem.captureException(error, {
      service: 'products.pages-cms',
      action: 'ensureCmsPagesIndex',
    });
  });
};

const isSingleNodeLocalMongoUri = (uri: string): boolean => {
  try {
    const parsed = new URL(uri);
    const hostname = parsed.hostname.trim().toLowerCase();
    return (
      (hostname === '127.0.0.1' || hostname === 'localhost') &&
      !parsed.searchParams.has('replicaSet')
    );
  } catch {
    return false;
  }
};

const getEcommerceMongoClientOptions = (uri: string): MongoClientOptions => ({
  connectTimeoutMS: 5_000,
  serverSelectionTimeoutMS: 5_000,
  ...(isSingleNodeLocalMongoUri(uri) ? { directConnection: true } : {}),
});

export const withEcommerceMongoDb = async <T>(
  source: MongoSource,
  task: (db: Db) => Promise<T>
): Promise<T> => {
  const config = resolveEcommerceMongoSourceConfig(source);
  if (!config.configured || config.uri === null || config.dbName === null) {
    throw configurationError(`Ecommerce ${source} MongoDB source is not configured.`);
  }
  const client = new MongoClient(config.uri, getEcommerceMongoClientOptions(config.uri));
  try {
    await client.connect();
    return await task(client.db(config.dbName));
  } finally {
    await client.close();
  }
};

export const withMainAppMongoDb = async <T>(
  source: MongoSource,
  task: (db: Db) => Promise<T>
): Promise<T> => {
  const config = await resolveMongoSourceConfig(source);
  if (!config.configured || config.uri === null || config.dbName === null) {
    throw configurationError(`MongoDB source "${source}" is not configured.`);
  }
  const client = new MongoClient(config.uri, getEcommerceMongoClientOptions(config.uri));
  try {
    await client.connect();
    return await task(client.db(config.dbName));
  } finally {
    await client.close();
  }
};
