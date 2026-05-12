import 'server-only';

import { getDb } from '@/lib/mongodb';

const FASTCOMET_STORAGE_CONFIG_SETTING_KEY = 'fastcomet_storage_config_v1';
const ECOM_SETTINGS_COLLECTION = 'ecom_settings';
const DEFAULT_TIMEOUT_MS = 20_000;
const MIN_TIMEOUT_MS = 1_000;
const MAX_TIMEOUT_MS = 120_000;

type StoredFastCometConfig = {
  baseUrl?: unknown;
  uploadEndpoint?: unknown;
  authToken?: unknown;
  timeoutMs?: unknown;
};

type FastCometUploadConfig = {
  baseUrl: string;
  uploadEndpoint: string;
  authToken: string | null;
  timeoutMs: number;
};

type FastCometUploadParams = {
  buffer: Buffer;
  filename: string;
  mimetype: string;
  publicPath: string;
  category?: string;
  folder?: string;
};

type SettingRecord = {
  _id?: string;
  key?: string;
  value?: unknown;
};

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeNullableString(value: unknown): string | null {
  const normalized = normalizeString(value);
  return normalized.length > 0 ? normalized : null;
}

function normalizeUrl(value: unknown): string {
  const normalized = normalizeString(value);
  if (normalized === '') return '';

  try {
    const url = new URL(normalized);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return '';
  }
}

function clampTimeout(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_TIMEOUT_MS;
  const int = Math.floor(parsed);
  return Math.min(Math.max(int, MIN_TIMEOUT_MS), MAX_TIMEOUT_MS);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function firstNonEmpty(values: string[]): string {
  for (const value of values) {
    if (value !== '') return value;
  }
  return '';
}

function parseStoredConfig(value: unknown): StoredFastCometConfig | null {
  if (isRecord(value)) return value;
  if (typeof value !== 'string' || value.trim() === '') return null;

  try {
    const parsed: unknown = JSON.parse(value);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function readStoredFastCometConfig(): Promise<StoredFastCometConfig | null> {
  try {
    const db = await getDb();
    const record = await db.collection<SettingRecord>(ECOM_SETTINGS_COLLECTION).findOne({
      $or: [{ key: FASTCOMET_STORAGE_CONFIG_SETTING_KEY }, { _id: FASTCOMET_STORAGE_CONFIG_SETTING_KEY }],
    });
    return parseStoredConfig(record?.value);
  } catch {
    return null;
  }
}

async function resolveFastCometUploadConfig(): Promise<FastCometUploadConfig> {
  const stored = await readStoredFastCometConfig();
  const readStored = (key: keyof StoredFastCometConfig): unknown => stored?.[key];

  return {
    baseUrl: firstNonEmpty([
      normalizeUrl(readStored('baseUrl')),
      normalizeUrl(process.env.FASTCOMET_STORAGE_BASE_URL),
      normalizeUrl(process.env.NEXT_PUBLIC_FILE_BASE_URL),
    ]),
    uploadEndpoint: firstNonEmpty([
      normalizeUrl(readStored('uploadEndpoint')),
      normalizeUrl(process.env.FASTCOMET_STORAGE_UPLOAD_URL),
    ]),
    authToken:
      normalizeNullableString(readStored('authToken')) ??
      normalizeNullableString(process.env.FASTCOMET_STORAGE_AUTH_TOKEN),
    timeoutMs: clampTimeout(readStored('timeoutMs') ?? process.env.FASTCOMET_STORAGE_TIMEOUT_MS),
  };
}

function buildUploadUrl(value: string, baseUrl: string, publicPath: string): string {
  if (value !== '') {
    try {
      const candidate = new URL(value);
      if (candidate.protocol === 'http:' || candidate.protocol === 'https:') return candidate.toString();
    } catch {
      if (baseUrl !== '') {
        return new URL(value.startsWith('/') ? value : `/${value}`, `${baseUrl}/`).toString();
      }
    }
  }

  if (baseUrl !== '') return new URL(publicPath, `${baseUrl}/`).toString();
  throw new Error('FastComet upload succeeded but no public URL was returned.');
}

function resolveUploadResponseUrl(body: unknown, baseUrl: string, publicPath: string): string {
  if (isRecord(body)) {
    const candidates = [
      body['url'],
      body['publicUrl'],
      body['filepath'],
      body['fileUrl'],
      body['path'],
      body['location'],
    ];

    for (const candidate of candidates) {
      const normalized = normalizeString(candidate);
      if (normalized !== '') return buildUploadUrl(normalized, baseUrl, publicPath);
    }
  }

  return buildUploadUrl('', baseUrl, publicPath);
}

function createUploadForm(params: FastCometUploadParams): FormData {
  const form = new FormData();
  form.append(
    'file',
    new Blob([new Uint8Array(params.buffer)], {
      type: params.mimetype === '' ? 'application/octet-stream' : params.mimetype,
    }),
    params.filename,
  );
  form.append('filename', params.filename);
  form.append('publicPath', params.publicPath);
  if (params.category !== undefined && params.category !== '') form.append('category', params.category);
  if (params.folder !== undefined && params.folder !== '') form.append('folder', params.folder);
  return form;
}

async function readFailureBody(response: Response): Promise<string> {
  const body = await response.text().catch(() => '');
  return body.slice(0, 300);
}

async function readSuccessBody(response: Response): Promise<unknown> {
  const body = await response.text().catch(() => '');
  if (body.trim() === '') return {};

  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new Error(`FastComet upload returned a non-JSON response. ${body.slice(0, 200)}`.trim());
  }
}

export async function uploadToFastComet(params: FastCometUploadParams): Promise<string> {
  const config = await resolveFastCometUploadConfig();
  if (config.uploadEndpoint === '') {
    throw new Error('FastComet upload is not configured. Set FASTCOMET_STORAGE_UPLOAD_URL.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const headers = new Headers();
    if (config.authToken !== null && config.authToken !== '') {
      headers.set('Authorization', `Bearer ${config.authToken}`);
    }

    const response = await fetch(config.uploadEndpoint, {
      method: 'POST',
      headers,
      body: createUploadForm(params),
      signal: controller.signal,
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`FastComet upload failed (${response.status}). ${await readFailureBody(response)}`.trim());
    }

    return resolveUploadResponseUrl(await readSuccessBody(response), config.baseUrl, params.publicPath);
  } finally {
    clearTimeout(timeout);
  }
}
