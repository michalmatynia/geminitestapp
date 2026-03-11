import 'dotenv/config';

import {
  FASTCOMET_STORAGE_CONFIG_SETTING_KEY,
  FILE_STORAGE_SOURCE_SETTING_KEY,
} from '@/shared/lib/files/constants';
import type {
  FastCometStorageConfig,
  FileStorageSource,
} from '@/shared/lib/files/constants';
import { invalidateFileStorageSettingsCache } from '@/shared/lib/files/services/storage/file-storage-service';
import { getMongoClient, getMongoDb } from '@/shared/lib/db/mongo-client';
import { serializeSetting } from '@/shared/utils/settings-json';

type CliOptions = {
  source: FileStorageSource;
  uploadEndpoint: string;
  baseUrl: string;
  deleteEndpoint: string;
  authToken: string;
  keepLocalCopy: boolean;
  timeoutMs: number;
  dryRun: boolean;
};

type SettingPayload = {
  key: string;
  value: string;
};

const DEFAULT_TIMEOUT_MS = 20_000;

const normalizeString = (value: string | undefined): string => (value ?? '').trim();

const parseBoolean = (value: string | undefined, fallback: boolean): boolean => {
  const normalized = normalizeString(value).toLowerCase();
  if (!normalized) return fallback;
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return fallback;
};

const parseNumber = (
  value: string | undefined,
  fallback: number,
  min: number,
  max: number
): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.floor(parsed), min), max);
};

const parseArgs = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    source:
      normalizeString(process.env['FILE_STORAGE_SOURCE']) === 'fastcomet' ? 'fastcomet' : 'local',
    uploadEndpoint: normalizeString(process.env['FASTCOMET_STORAGE_UPLOAD_URL']),
    baseUrl: normalizeString(process.env['FASTCOMET_STORAGE_BASE_URL']),
    deleteEndpoint: normalizeString(process.env['FASTCOMET_STORAGE_DELETE_URL']),
    authToken: normalizeString(process.env['FASTCOMET_STORAGE_AUTH_TOKEN']),
    keepLocalCopy: parseBoolean(process.env['FASTCOMET_STORAGE_KEEP_LOCAL_COPY'], true),
    timeoutMs: parseNumber(
      process.env['FASTCOMET_STORAGE_TIMEOUT_MS'],
      DEFAULT_TIMEOUT_MS,
      1_000,
      120_000
    ),
    dryRun: false,
  };

  argv.forEach((arg) => {
    if (arg === '--dry-run') {
      options.dryRun = true;
      return;
    }
    if (arg === '--write') {
      options.dryRun = false;
      return;
    }
    if (arg.startsWith('--source=')) {
      const value = normalizeString(arg.slice('--source='.length)).toLowerCase();
      if (value === 'fastcomet' || value === 'local') {
        options.source = value;
      }
      return;
    }
    if (arg.startsWith('--upload-endpoint=')) {
      options.uploadEndpoint = normalizeString(arg.slice('--upload-endpoint='.length));
      return;
    }
    if (arg.startsWith('--base-url=')) {
      options.baseUrl = normalizeString(arg.slice('--base-url='.length));
      return;
    }
    if (arg.startsWith('--delete-endpoint=')) {
      options.deleteEndpoint = normalizeString(arg.slice('--delete-endpoint='.length));
      return;
    }
    if (arg.startsWith('--auth-token=')) {
      options.authToken = normalizeString(arg.slice('--auth-token='.length));
      return;
    }
    if (arg.startsWith('--keep-local-copy=')) {
      options.keepLocalCopy = parseBoolean(arg.slice('--keep-local-copy='.length), true);
      return;
    }
    if (arg.startsWith('--timeout-ms=')) {
      options.timeoutMs = parseNumber(
        arg.slice('--timeout-ms='.length),
        DEFAULT_TIMEOUT_MS,
        1_000,
        120_000
      );
    }
  });

  return options;
};

const buildPayloads = (options: CliOptions): SettingPayload[] => {
  const fastCometConfig: FastCometStorageConfig = {
    baseUrl: options.baseUrl,
    uploadEndpoint: options.uploadEndpoint,
    deleteEndpoint: options.deleteEndpoint || null,
    authToken: options.authToken || null,
    keepLocalCopy: options.keepLocalCopy,
    timeoutMs: options.timeoutMs,
  };

  return [
    { key: FILE_STORAGE_SOURCE_SETTING_KEY, value: options.source },
    {
      key: FASTCOMET_STORAGE_CONFIG_SETTING_KEY,
      value: serializeSetting(fastCometConfig),
    },
  ];
};

const writeMongoSettings = async (payloads: SettingPayload[]): Promise<void> => {
  if (!process.env['MONGODB_URI']) return;
  const db = await getMongoDb();
  const collection = db.collection<{
    key: string;
    value: string;
    updatedAt?: Date;
    createdAt?: Date;
  }>('settings');
  const now = new Date();

  for (const payload of payloads) {
    await collection.updateOne(
      { key: payload.key },
      {
        $set: { value: payload.value, updatedAt: now },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    );
  }
};

async function main(): Promise<void> {
  if (!process.env['MONGODB_URI']) {
    throw new Error('MONGODB_URI is required.');
  }
  const options = parseArgs(process.argv.slice(2));

  if (options.source === 'fastcomet' && !options.uploadEndpoint) {
    throw new Error(
      'FastComet source requires an upload endpoint. Set FASTCOMET_STORAGE_UPLOAD_URL or pass --upload-endpoint.'
    );
  }

  const payloads = buildPayloads(options);

  if (options.dryRun) {
    console.log(
      JSON.stringify(
        {
          mode: 'dry-run',
          provider: 'mongodb',
          payloads: payloads.map((payload) => ({
            key: payload.key,
            valuePreview:
              payload.key === FASTCOMET_STORAGE_CONFIG_SETTING_KEY
                ? `${payload.value.slice(0, 120)}...`
                : payload.value,
          })),
        },
        null,
        2
      )
    );
    return;
  }

  await writeMongoSettings(payloads);

  invalidateFileStorageSettingsCache();

  console.log(
    JSON.stringify(
      {
        mode: 'write',
        provider: 'mongodb',
        source: options.source,
        uploadEndpoint: options.uploadEndpoint,
        baseUrl: options.baseUrl || null,
        deleteEndpoint: options.deleteEndpoint || null,
        keepLocalCopy: options.keepLocalCopy,
        timeoutMs: options.timeoutMs,
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
    console.error('Failed to configure FastComet storage settings:', error);
    await closeResources();
    process.exit(1);
  });
