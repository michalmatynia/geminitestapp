import 'dotenv/config';

import fs from 'fs/promises';
import path from 'path';

import type { Document, WithId } from 'mongodb';

import { FILE_STORAGE_SOURCE_SETTING_KEY } from '@/shared/lib/files/constants';
import { getMongoClient, getMongoDb } from '@/shared/lib/db/mongo-client';
import {
  getFileStorageSettings,
  getPublicPathFromStoredPath,
  isHttpFilepath,
  uploadBufferToFastComet,
} from '@/shared/lib/files/services/storage/file-storage-service';
import { getDiskPathFromPublicPath } from '@/shared/lib/files/file-uploader';

type ImageFileDocument = {
  _id: string;
  id?: string;
  filename?: string;
  filepath?: string;
  mimetype?: string;
  size?: number;
  updatedAt?: Date;
};

type CliOptions = {
  write: boolean;
  limit: number;
  prefix: string | null;
  setSource: boolean;
};

type MigrationResult = {
  id: string;
  from: string;
  publicPath: string | null;
  status: 'dry-run' | 'migrated' | 'skipped' | 'error';
  to?: string;
  reason?: string;
};

const IMAGE_FILE_COLLECTION = 'image_files';
const SETTINGS_COLLECTION = 'settings';
const DEFAULT_LIMIT = 100;

const normalizeString = (value: string | undefined): string => (value ?? '').trim();

const parseBooleanFlag = (value: string | undefined): boolean => {
  const normalized = normalizeString(value).toLowerCase();
  return ['1', 'true', 'yes', 'on', 'fastcomet'].includes(normalized);
};

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
};

const parseArgs = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    write: false,
    limit: parsePositiveInt(process.env['FASTCOMET_MIGRATION_LIMIT'], DEFAULT_LIMIT),
    prefix: normalizeString(process.env['FASTCOMET_MIGRATION_PREFIX']) || null,
    setSource: parseBooleanFlag(process.env['FASTCOMET_MIGRATION_SET_SOURCE']),
  };

  argv.forEach((arg) => {
    if (arg === '--write') {
      options.write = true;
      return;
    }
    if (arg === '--dry-run') {
      options.write = false;
      return;
    }
    if (arg === '--set-source=fastcomet' || arg === '--set-source') {
      options.setSource = true;
      return;
    }
    if (arg.startsWith('--limit=')) {
      options.limit = parsePositiveInt(arg.slice('--limit='.length), options.limit);
      return;
    }
    if (arg.startsWith('--prefix=')) {
      options.prefix = normalizeString(arg.slice('--prefix='.length)) || null;
    }
  });

  return options;
};

const toId = (doc: ImageFileDocument): string => doc.id ?? doc._id;

const guessMimeType = (filename: string): string => {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.avif') return 'image/avif';
  if (ext === '.pdf') return 'application/pdf';
  return 'application/octet-stream';
};

const inferCategory = (publicPath: string): string | null => {
  if (publicPath.startsWith('/uploads/products/')) return 'products';
  if (publicPath.startsWith('/uploads/notes/')) return 'notes';
  if (publicPath.startsWith('/uploads/cms/')) return 'cms';
  if (publicPath.startsWith('/uploads/studio/')) return 'studio';
  if (publicPath.startsWith('/uploads/case-resolver/')) return 'case_resolver';
  if (publicPath.startsWith('/uploads/agentcreator/')) return 'agentcreator';
  return null;
};

const findReadableDiskPath = async (publicPath: string): Promise<string | null> => {
  const candidates = new Set<string>();
  try {
    candidates.add(getDiskPathFromPublicPath(publicPath));
  } catch {
    // Fall through to explicit compatibility candidates.
  }

  const cleaned = publicPath.replace(/^\/uploads\/+/, '');
  candidates.add(path.resolve(process.cwd(), 'public', 'uploads', cleaned));
  candidates.add(path.resolve('/var/tmp/libapp-uploads', cleaned));

  for (const candidate of candidates) {
    try {
      const stat = await fs.stat(candidate);
      if (stat.isFile()) return candidate;
    } catch {
      // Try the next candidate.
    }
  }

  return null;
};

const buildImageFileQuery = (options: CliOptions): Document => {
  const query: Document = {
    filepath: {
      $type: 'string',
      $not: /^https?:\/\//i,
    },
  };

  if (options.prefix) {
    query['filepath'] = {
      ...query['filepath'],
      $regex: `^${options.prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
    };
  }

  return query;
};

const migrateImageFile = async (
  doc: WithId<ImageFileDocument>,
  options: CliOptions
): Promise<MigrationResult> => {
  const id = toId(doc);
  const filepath = normalizeString(doc.filepath);
  if (!filepath || isHttpFilepath(filepath)) {
    return { id, from: filepath, publicPath: null, status: 'skipped', reason: 'not a local path' };
  }

  const publicPath = getPublicPathFromStoredPath(filepath);
  if (!publicPath || !publicPath.startsWith('/uploads/')) {
    return { id, from: filepath, publicPath, status: 'skipped', reason: 'not an uploads path' };
  }

  const diskPath = await findReadableDiskPath(publicPath);
  if (!diskPath) {
    return { id, from: filepath, publicPath, status: 'skipped', reason: 'local file missing' };
  }

  if (!options.write) {
    return { id, from: filepath, publicPath, status: 'dry-run' };
  }

  try {
    const buffer = await fs.readFile(diskPath);
    const filename = doc.filename?.trim() || path.basename(publicPath);
    const mimetype = doc.mimetype?.trim() || guessMimeType(filename);
    const remoteUrl = await uploadBufferToFastComet({
      buffer,
      filename,
      mimetype,
      publicPath,
      category: inferCategory(publicPath),
    });

    const db = await getMongoDb();
    await db.collection<ImageFileDocument>(IMAGE_FILE_COLLECTION).updateOne(
      { _id: doc._id },
      {
        $set: {
          filepath: remoteUrl,
          updatedAt: new Date(),
          fastCometMigratedAt: new Date(),
        },
      }
    );

    return { id, from: filepath, publicPath, status: 'migrated', to: remoteUrl };
  } catch (error) {
    return {
      id,
      from: filepath,
      publicPath,
      status: 'error',
      reason: error instanceof Error ? error.message : String(error),
    };
  }
};

const maybeSetSource = async (enabled: boolean): Promise<void> => {
  if (!enabled) return;
  const db = await getMongoDb();
  await db.collection(SETTINGS_COLLECTION).updateOne(
    { key: FILE_STORAGE_SOURCE_SETTING_KEY },
    {
      $set: {
        key: FILE_STORAGE_SOURCE_SETTING_KEY,
        value: 'fastcomet',
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );
};

async function main(): Promise<void> {
  if (!process.env['MONGODB_URI']) {
    throw new Error('MONGODB_URI is required.');
  }

  const options = parseArgs(process.argv.slice(2));
  const settings = await getFileStorageSettings({ force: true });
  if (!settings.fastComet.uploadEndpoint) {
    throw new Error('FastComet upload endpoint is not configured.');
  }

  const db = await getMongoDb();
  const docs = await db
    .collection<ImageFileDocument>(IMAGE_FILE_COLLECTION)
    .find(buildImageFileQuery(options))
    .limit(options.limit)
    .toArray();

  const results: MigrationResult[] = [];
  for (const doc of docs) {
    results.push(await migrateImageFile(doc, options));
  }

  await maybeSetSource(options.write && options.setSource);

  const counts = results.reduce<Record<string, number>>((acc, result) => {
    acc[result.status] = (acc[result.status] ?? 0) + 1;
    return acc;
  }, {});

  console.log(
    JSON.stringify(
      {
        mode: options.write ? 'write' : 'dry-run',
        source: settings.source,
        uploadEndpoint: settings.fastComet.uploadEndpoint,
        baseUrl: settings.fastComet.baseUrl,
        limit: options.limit,
        prefix: options.prefix,
        setSource: options.write && options.setSource,
        scanned: docs.length,
        counts,
        results: results.slice(0, 50),
      },
      null,
      2
    )
  );
}

const closeResources = async (): Promise<void> => {
  if (process.env['MONGODB_URI']) {
    const mongoClient = await getMongoClient().catch(() => null);
    await mongoClient?.close().catch(() => {});
  }
};

void main()
  .then(async () => {
    await closeResources();
    process.exit(0);
  })
  .catch(async (error: unknown) => {
    console.error('Failed to migrate files to FastComet:', error);
    await closeResources();
    process.exit(1);
  });
