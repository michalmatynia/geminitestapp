import 'dotenv/config';

import fs from 'fs/promises';
import path from 'path';

import {
  FASTCOMET_STORAGE_CONFIG_SETTING_KEY,
  FILE_STORAGE_SOURCE_SETTING_KEY,
} from '@/features/files/constants/storage-settings';
import type { FastCometStorageConfig } from '@/features/files/constants/storage-settings';
import {
  getFileStorageSettings,
  getPublicPathFromStoredPath,
  isHttpFilepath,
  uploadBufferToFastComet,
} from '@/shared/lib/files/services/storage/file-storage-service';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import { getMongoClient, getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';
import { serializeSetting } from '@/shared/utils/settings-json';

type MigrationTarget = 'image-files' | 'note-files' | 'assets3d';

type CliOptions = {
  dryRun: boolean;
  limit: number | null;
  targets: Set<MigrationTarget>;
  sourceAfterMigration: 'local' | 'fastcomet' | 'no-change';
  uploadEndpointOverride: string | null;
  baseUrlOverride: string | null;
  deleteEndpointOverride: string | null;
  authTokenOverride: string | null;
  timeoutMsOverride: number | null;
  keepLocalCopyOverride: boolean | null;
};

type MigrationCounters = {
  scanned: number;
  migrated: number;
  skippedAlreadyRemote: number;
  skippedNonUploadPath: number;
  skippedMissingLocalFile: number;
  skippedInvalidPath: number;
  failedUpload: number;
  failedUpdate: number;
};

type UploadDescriptor = {
  publicPath: string;
  filename: string;
  category: string | null;
  projectId: string | null;
  folder: string | null;
};

type ImageFilePrismaRow = {
  id: string;
  filepath: string;
  filename: string;
  mimetype: string;
};

type NoteFilePrismaRow = {
  id: string;
  noteId: string;
  filepath: string;
  filename: string;
  mimetype: string;
};

type Asset3DPrismaRow = {
  id: string;
  filepath: string;
  filename: string;
  mimetype: string;
};

type MongoImageFileRow = {
  _id?: string;
  id?: string;
  filepath?: string;
  filename?: string;
  mimetype?: string;
};

type MongoNoteFileRow = {
  _id?: string;
  id?: string;
  noteId?: string;
  filepath?: string;
  filename?: string;
  mimetype?: string;
};

const uploadsRoot = path.join(process.cwd(), 'public', 'uploads');
const DEFAULT_BATCH_LIMIT = 10_000;

const canUsePrisma = (): boolean => Boolean(process.env['DATABASE_URL']) && 'setting' in prisma;

const normalizeString = (value: string | null | undefined): string => (value ?? '').trim();

const parsePositiveInt = (value: string | undefined): number | null => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.floor(parsed);
};

const parseBoolean = (value: string | undefined): boolean | null => {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return null;
};

const parseTargets = (value: string): Set<MigrationTarget> => {
  const all = new Set<MigrationTarget>(['image-files', 'note-files', 'assets3d']);
  const parts = value
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);

  if (parts.length === 0) return all;

  const selected = new Set<MigrationTarget>();
  for (const part of parts) {
    if (part === 'image-files' || part === 'note-files' || part === 'assets3d') {
      selected.add(part);
    }
  }

  return selected.size > 0 ? selected : all;
};

const parseArgs = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    dryRun: true,
    limit: null,
    targets: new Set<MigrationTarget>(['image-files', 'note-files', 'assets3d']),
    sourceAfterMigration: 'no-change',
    uploadEndpointOverride: null,
    baseUrlOverride: null,
    deleteEndpointOverride: null,
    authTokenOverride: null,
    timeoutMsOverride: null,
    keepLocalCopyOverride: null,
  };

  argv.forEach((arg) => {
    if (arg === '--write') {
      options.dryRun = false;
      return;
    }
    if (arg === '--dry-run') {
      options.dryRun = true;
      return;
    }
    if (arg.startsWith('--limit=')) {
      options.limit = parsePositiveInt(arg.slice('--limit='.length));
      return;
    }
    if (arg.startsWith('--only=')) {
      options.targets = parseTargets(arg.slice('--only='.length));
      return;
    }
    if (arg === '--set-source=fastcomet' || arg === '--set-source=fastcomer') {
      options.sourceAfterMigration = 'fastcomet';
      return;
    }
    if (arg === '--set-source=local') {
      options.sourceAfterMigration = 'local';
      return;
    }
    if (arg.startsWith('--upload-endpoint=')) {
      options.uploadEndpointOverride = normalizeString(arg.slice('--upload-endpoint='.length));
      return;
    }
    if (arg.startsWith('--base-url=')) {
      options.baseUrlOverride = normalizeString(arg.slice('--base-url='.length));
      return;
    }
    if (arg.startsWith('--delete-endpoint=')) {
      options.deleteEndpointOverride = normalizeString(arg.slice('--delete-endpoint='.length));
      return;
    }
    if (arg.startsWith('--auth-token=')) {
      options.authTokenOverride = normalizeString(arg.slice('--auth-token='.length));
      return;
    }
    if (arg.startsWith('--timeout-ms=')) {
      options.timeoutMsOverride = parsePositiveInt(arg.slice('--timeout-ms='.length));
      return;
    }
    if (arg.startsWith('--keep-local-copy=')) {
      options.keepLocalCopyOverride = parseBoolean(arg.slice('--keep-local-copy='.length));
    }
  });

  return options;
};

const resolveFastCometConfig = async (options: CliOptions): Promise<FastCometStorageConfig> => {
  const settings = await getFileStorageSettings({ force: true });
  const base = settings.fastComet;

  const resolved: FastCometStorageConfig = {
    ...base,
    ...(options.uploadEndpointOverride ? { uploadEndpoint: options.uploadEndpointOverride } : {}),
    ...(options.baseUrlOverride !== null ? { baseUrl: options.baseUrlOverride } : {}),
    ...(options.deleteEndpointOverride !== null
      ? {
          deleteEndpoint:
            options.deleteEndpointOverride.trim().length > 0
              ? options.deleteEndpointOverride
              : null,
        }
      : {}),
    ...(options.authTokenOverride !== null
      ? {
          authToken: options.authTokenOverride.trim().length > 0 ? options.authTokenOverride : null,
        }
      : {}),
    ...(options.timeoutMsOverride !== null
      ? {
          timeoutMs: Math.min(Math.max(options.timeoutMsOverride, 1_000), 120_000),
        }
      : {}),
    ...(options.keepLocalCopyOverride !== null
      ? { keepLocalCopy: options.keepLocalCopyOverride }
      : {}),
  };

  if (!resolved.uploadEndpoint && !options.dryRun) {
    throw new Error(
      'FastComet upload endpoint is missing. Configure settings or pass --upload-endpoint.'
    );
  }

  return resolved;
};

const isUploadPublicPath = (publicPath: string): boolean => publicPath.startsWith('/uploads/');

const buildUploadDescriptor = (publicPath: string): UploadDescriptor => {
  const relative = publicPath.replace(/^\/+/, '');
  const segments = relative.split('/').filter(Boolean);
  const [root, category = null, maybeProject = null, ...rest] = segments;

  if (root !== 'uploads') {
    return {
      publicPath,
      filename: path.basename(publicPath),
      category: null,
      projectId: null,
      folder: null,
    };
  }

  const filename = path.basename(publicPath);
  const folderSegments = rest.slice(0, Math.max(rest.length - 1, 0));

  const projectId = category === 'notes' || category === 'studio' ? maybeProject : null;

  const folder =
    category === 'case-resolver'
      ? [maybeProject, ...folderSegments].filter(Boolean).join('/') || null
      : category === 'studio'
        ? folderSegments.join('/') || null
        : null;

  return {
    publicPath,
    filename,
    category,
    projectId,
    folder,
  };
};

const resolveDiskPath = (publicPath: string): string =>
  path.resolve(process.cwd(), 'public', publicPath.replace(/^\/+/, ''));

const initCounters = (): MigrationCounters => ({
  scanned: 0,
  migrated: 0,
  skippedAlreadyRemote: 0,
  skippedNonUploadPath: 0,
  skippedMissingLocalFile: 0,
  skippedInvalidPath: 0,
  failedUpload: 0,
  failedUpdate: 0,
});

const migrateRecord = async (params: {
  filepath: string;
  filename: string;
  mimetype: string;
  counters: MigrationCounters;
  fastComet: FastCometStorageConfig;
  dryRun: boolean;
  onPersist: (remotePath: string) => Promise<void>;
}): Promise<void> => {
  params.counters.scanned += 1;

  if (isHttpFilepath(params.filepath)) {
    params.counters.skippedAlreadyRemote += 1;
    return;
  }

  const publicPath = getPublicPathFromStoredPath(params.filepath);
  if (!publicPath) {
    params.counters.skippedInvalidPath += 1;
    return;
  }

  if (!isUploadPublicPath(publicPath)) {
    params.counters.skippedNonUploadPath += 1;
    return;
  }

  const diskPath = resolveDiskPath(publicPath);
  let buffer: Buffer;
  try {
    buffer = await fs.readFile(diskPath);
  } catch {
    params.counters.skippedMissingLocalFile += 1;
    return;
  }

  if (params.dryRun) {
    params.counters.migrated += 1;
    return;
  }

  const descriptor = buildUploadDescriptor(publicPath);

  let remotePath: string;
  try {
    remotePath = await uploadBufferToFastComet({
      buffer,
      filename: descriptor.filename || params.filename || path.basename(publicPath),
      mimetype: params.mimetype || 'application/octet-stream',
      publicPath: descriptor.publicPath,
      category: descriptor.category,
      projectId: descriptor.projectId,
      folder: descriptor.folder,
      fastComet: params.fastComet,
    });
  } catch {
    params.counters.failedUpload += 1;
    return;
  }

  try {
    await params.onPersist(remotePath);
    params.counters.migrated += 1;
  } catch {
    params.counters.failedUpdate += 1;
  }
};

const migratePrismaImageFiles = async (params: {
  fastComet: FastCometStorageConfig;
  dryRun: boolean;
  limit: number;
}): Promise<MigrationCounters> => {
  const counters = initCounters();
  if (!canUsePrisma()) return counters;

  const rows = await prisma.imageFile.findMany({
    select: { id: true, filepath: true, filename: true, mimetype: true },
    take: params.limit,
  });

  for (const row of rows as ImageFilePrismaRow[]) {
    await migrateRecord({
      filepath: row.filepath,
      filename: row.filename,
      mimetype: row.mimetype,
      counters,
      fastComet: params.fastComet,
      dryRun: params.dryRun,
      onPersist: async (remotePath: string): Promise<void> => {
        await prisma.imageFile.update({
          where: { id: row.id },
          data: { filepath: remotePath },
        });
      },
    });
  }

  return counters;
};

const migratePrismaNoteFiles = async (params: {
  fastComet: FastCometStorageConfig;
  dryRun: boolean;
  limit: number;
}): Promise<MigrationCounters> => {
  const counters = initCounters();
  if (!canUsePrisma()) return counters;

  const rows = await prisma.noteFile.findMany({
    select: {
      id: true,
      noteId: true,
      filepath: true,
      filename: true,
      mimetype: true,
    },
    take: params.limit,
  });

  for (const row of rows as NoteFilePrismaRow[]) {
    await migrateRecord({
      filepath: row.filepath,
      filename: row.filename,
      mimetype: row.mimetype,
      counters,
      fastComet: params.fastComet,
      dryRun: params.dryRun,
      onPersist: async (remotePath: string): Promise<void> => {
        await prisma.noteFile.update({
          where: { id: row.id },
          data: { filepath: remotePath },
        });
      },
    });
  }

  return counters;
};

const migratePrismaAssets3D = async (params: {
  fastComet: FastCometStorageConfig;
  dryRun: boolean;
  limit: number;
}): Promise<MigrationCounters> => {
  const counters = initCounters();
  if (!canUsePrisma()) return counters;

  const rows = await prisma.asset3D.findMany({
    select: { id: true, filepath: true, filename: true, mimetype: true },
    take: params.limit,
  });

  for (const row of rows as Asset3DPrismaRow[]) {
    await migrateRecord({
      filepath: row.filepath,
      filename: row.filename,
      mimetype: row.mimetype,
      counters,
      fastComet: params.fastComet,
      dryRun: params.dryRun,
      onPersist: async (remotePath: string): Promise<void> => {
        await prisma.asset3D.update({
          where: { id: row.id },
          data: { filepath: remotePath },
        });
      },
    });
  }

  return counters;
};

const migrateMongoImageFiles = async (params: {
  fastComet: FastCometStorageConfig;
  dryRun: boolean;
  limit: number;
}): Promise<MigrationCounters> => {
  const counters = initCounters();
  if (!process.env['MONGODB_URI']) return counters;

  const db = await getMongoDb();
  const rows = await db
    .collection<MongoImageFileRow>('image_files')
    .find({}, { projection: { _id: 1, id: 1, filepath: 1, filename: 1, mimetype: 1 } })
    .limit(params.limit)
    .toArray();

  for (const row of rows) {
    const rowId = row.id ?? row._id;
    const filepath = normalizeString(row.filepath);
    if (!rowId || !filepath) {
      counters.scanned += 1;
      counters.skippedInvalidPath += 1;
      continue;
    }

    await migrateRecord({
      filepath,
      filename: normalizeString(row.filename) || path.basename(filepath),
      mimetype: normalizeString(row.mimetype) || 'application/octet-stream',
      counters,
      fastComet: params.fastComet,
      dryRun: params.dryRun,
      onPersist: async (remotePath: string): Promise<void> => {
        const filter: Record<string, unknown> = {
          $or: [{ _id: rowId }, { id: rowId }],
        };
        await db
          .collection('image_files')
          .updateOne(filter, { $set: { filepath: remotePath, updatedAt: new Date() } });
      },
    });
  }

  return counters;
};

const migrateMongoNoteFiles = async (params: {
  fastComet: FastCometStorageConfig;
  dryRun: boolean;
  limit: number;
}): Promise<MigrationCounters> => {
  const counters = initCounters();
  if (!process.env['MONGODB_URI']) return counters;

  const db = await getMongoDb();
  const rows = await db
    .collection<MongoNoteFileRow>('noteFiles')
    .find({}, { projection: { _id: 1, id: 1, noteId: 1, filepath: 1, filename: 1, mimetype: 1 } })
    .limit(params.limit)
    .toArray();

  for (const row of rows) {
    const rowId = row.id ?? row._id;
    const filepath = normalizeString(row.filepath);
    if (!rowId || !filepath) {
      counters.scanned += 1;
      counters.skippedInvalidPath += 1;
      continue;
    }

    await migrateRecord({
      filepath,
      filename: normalizeString(row.filename) || path.basename(filepath),
      mimetype: normalizeString(row.mimetype) || 'application/octet-stream',
      counters,
      fastComet: params.fastComet,
      dryRun: params.dryRun,
      onPersist: async (remotePath: string): Promise<void> => {
        const filter: Record<string, unknown> = {
          $or: [{ _id: rowId }, { id: rowId }],
        };
        await db
          .collection('noteFiles')
          .updateOne(filter, { $set: { filepath: remotePath, updatedAt: new Date() } });
      },
    });
  }

  return counters;
};

const setSourceAfterMigration = async (params: {
  source: 'local' | 'fastcomet';
  fastComet: FastCometStorageConfig;
  provider: 'mongodb' | 'prisma';
}): Promise<void> => {
  const payloads = [
    { key: FILE_STORAGE_SOURCE_SETTING_KEY, value: params.source },
    {
      key: FASTCOMET_STORAGE_CONFIG_SETTING_KEY,
      value: serializeSetting(params.fastComet),
    },
  ];

  if (params.provider === 'mongodb' && process.env['MONGODB_URI']) {
    const db = await getMongoDb();
    const now = new Date();
    for (const payload of payloads) {
      await db
        .collection('settings')
        .updateOne(
          { key: payload.key },
          { $set: { value: payload.value, updatedAt: now }, $setOnInsert: { createdAt: now } },
          { upsert: true }
        );
    }
  }

  if (canUsePrisma()) {
    for (const payload of payloads) {
      await prisma.setting.upsert({
        where: { key: payload.key },
        update: { value: payload.value },
        create: { key: payload.key, value: payload.value },
      });
    }
  }
};

const summarize = (label: string, counters: MigrationCounters): Record<string, unknown> => ({
  label,
  ...counters,
});

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const limit = options.limit ?? DEFAULT_BATCH_LIMIT;
  const provider = await getAppDbProvider();
  const fastComet = await resolveFastCometConfig(options);

  const imageFilesResult = options.targets.has('image-files')
    ? provider === 'mongodb'
      ? await migrateMongoImageFiles({
          fastComet,
          dryRun: options.dryRun,
          limit,
        })
      : await migratePrismaImageFiles({
          fastComet,
          dryRun: options.dryRun,
          limit,
        })
    : null;

  const noteFilesResult = options.targets.has('note-files')
    ? provider === 'mongodb'
      ? await migrateMongoNoteFiles({
          fastComet,
          dryRun: options.dryRun,
          limit,
        })
      : await migratePrismaNoteFiles({
          fastComet,
          dryRun: options.dryRun,
          limit,
        })
    : null;

  const assets3dResult = options.targets.has('assets3d')
    ? await migratePrismaAssets3D({
        fastComet,
        dryRun: options.dryRun,
        limit,
      })
    : null;

  if (!options.dryRun && options.sourceAfterMigration !== 'no-change') {
    await setSourceAfterMigration({
      source: options.sourceAfterMigration,
      fastComet,
      provider,
    });
  }

  const summary = {
    mode: options.dryRun ? 'dry-run' : 'write',
    provider,
    targets: Array.from(options.targets.values()),
    limit,
    uploadsRoot,
    sourceAfterMigration: options.sourceAfterMigration,
    fastComet: {
      uploadEndpoint: fastComet.uploadEndpoint,
      baseUrl: fastComet.baseUrl || null,
      deleteEndpoint: fastComet.deleteEndpoint,
      keepLocalCopy: fastComet.keepLocalCopy,
      timeoutMs: fastComet.timeoutMs,
    },
    results: [
      imageFilesResult ? summarize('image-files', imageFilesResult) : null,
      noteFilesResult ? summarize('note-files', noteFilesResult) : null,
      assets3dResult ? summarize('assets3d', assets3dResult) : null,
    ].filter(Boolean),
  };

  console.log(JSON.stringify(summary, null, 2));
}

const closeResources = async (): Promise<void> => {
  await prisma.$disconnect().catch(() => {});
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
    console.error('Failed to migrate uploads to FastComet:', error);
    await closeResources();
    process.exit(1);
  });
