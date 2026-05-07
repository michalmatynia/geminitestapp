import 'server-only';

import type { LookupFunction } from 'node:net';
import { Agent, type Dispatcher } from 'undici';

import type { FastCometStorageConfig } from '@/shared/lib/files/constants';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { parseJsonSetting } from '@/shared/utils/settings-json';
import { readFastCometFailureBody, readFastCometJsonSuccessBody } from './fastcomet-response';

const DEFAULT_TIMEOUT_MS = 20_000;
const MIN_TIMEOUT_MS = 1_000;
const MAX_TIMEOUT_MS = 120_000;
const DEFAULT_FASTCOMET_BASE_URL = 'https://sparksofsindri.com';
const UPLOADS_PREFIX = '/uploads/';
const LEGACY_FASTCOMET_HOSTS = new Set(['qubrick.io', 'www.qubrick.io']);

const normalizeString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const normalizeNullableString = (value: unknown): string | null => {
  const trimmed = normalizeString(value);
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeIpAddress = (value: unknown): string | null => {
  const trimmed = normalizeString(value);
  if (trimmed.length === 0) return null;
  return /^[A-Fa-f0-9:.]+$/.test(trimmed) ? trimmed : null;
};

const clampTimeout = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_TIMEOUT_MS;
  const int = Math.floor(parsed);
  return Math.min(Math.max(int, MIN_TIMEOUT_MS), MAX_TIMEOUT_MS);
};

const normalizeUrl = (value: unknown): string => {
  const trimmed = normalizeString(value);
  if (trimmed.length === 0) return '';
  try {
    const url = new URL(trimmed);
    if (LEGACY_FASTCOMET_HOSTS.has(url.hostname.toLowerCase())) {
      const defaultUrl = new URL(DEFAULT_FASTCOMET_BASE_URL);
      url.protocol = defaultUrl.protocol;
      url.hostname = defaultUrl.hostname;
      url.port = defaultUrl.port;
    }
    return url.toString().replace(/\/$/, '');
  } catch (error) {
    void ErrorSystem.captureException(error);
    return '';
  }
};

const normalizeOptionalUrl = (value: unknown): string | null => {
  const normalized = normalizeUrl(value);
  return normalized.length > 0 ? normalized : null;
};

const parseBoolean = (value: unknown, fallback: boolean): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized.length === 0) return fallback;
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return fallback;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const readStoredConfigValue = (
  stored: Partial<FastCometStorageConfig>,
  key: keyof FastCometStorageConfig,
  envKey: string
): unknown => stored[key] ?? process.env[envKey];

export const resolveFastCometConfig = (raw: string | null): FastCometStorageConfig => {
  const stored = parseJsonSetting<Partial<FastCometStorageConfig> | null>(raw, null) ?? {};

  return {
    baseUrl: normalizeUrl(readStoredConfigValue(stored, 'baseUrl', 'FASTCOMET_STORAGE_BASE_URL')),
    uploadEndpoint: normalizeUrl(readStoredConfigValue(stored, 'uploadEndpoint', 'FASTCOMET_STORAGE_UPLOAD_URL')),
    deleteEndpoint: normalizeOptionalUrl(readStoredConfigValue(stored, 'deleteEndpoint', 'FASTCOMET_STORAGE_DELETE_URL')),
    authToken: normalizeNullableString(readStoredConfigValue(stored, 'authToken', 'FASTCOMET_STORAGE_AUTH_TOKEN')),
    keepLocalCopy: parseBoolean(
      readStoredConfigValue(stored, 'keepLocalCopy', 'FASTCOMET_STORAGE_KEEP_LOCAL_COPY'),
      true
    ),
    timeoutMs: clampTimeout(readStoredConfigValue(stored, 'timeoutMs', 'FASTCOMET_STORAGE_TIMEOUT_MS')),
    resolveIp: normalizeIpAddress(readStoredConfigValue(stored, 'resolveIp', 'FASTCOMET_STORAGE_RESOLVE_IP')),
  };
};

export const isHttpFilepath = (filepath: string): boolean => /^https?:\/\//i.test(filepath.trim());

const toCanonicalUploadUrl = (value: string, baseUrl: string): string | null => {
  if (baseUrl.length === 0) return null;
  try {
    const url = new URL(value);
    if (!isHttpFilepath(value) || !url.pathname.startsWith(UPLOADS_PREFIX)) return null;
    return new URL(`${url.pathname}${url.search}${url.hash}`, `${baseUrl}/`).toString();
  } catch (error) {
    void ErrorSystem.captureException(error);
    return null;
  }
};

export const toAbsoluteUrl = (value: string, baseUrl: string): string => {
  if (isHttpFilepath(value)) return toCanonicalUploadUrl(value, baseUrl) ?? value;
  if (baseUrl.length === 0) return value;
  try {
    return new URL(value.startsWith('/') ? value : `/${value}`, `${baseUrl}/`).toString();
  } catch (error) {
    void ErrorSystem.captureException(error);
    return value;
  }
};

const withTimeout = async <T>(
  timeoutMs: number,
  task: (signal: AbortSignal) => Promise<T>
): Promise<T> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    return await task(controller.signal);
  } finally {
    clearTimeout(timeoutId);
  }
};

const createFastCometLookup =
  (resolveIp: string, family: 4 | 6): LookupFunction =>
  (_hostname, options, callback): void => {
    if (options.all === true) {
      callback(null, [{ address: resolveIp, family }]);
      return;
    }
    callback(null, resolveIp, family);
  };

const createFastCometDispatcher = (fastComet: FastCometStorageConfig): Dispatcher | undefined => {
  const resolveIp = normalizeIpAddress(fastComet.resolveIp);
  if (resolveIp === null) return undefined;

  const family = resolveIp.includes(':') ? 6 : 4;
  const connect: Agent.Options['connect'] = {
    lookup: createFastCometLookup(resolveIp, family),
  };
  return new Agent({ connect });
};

const withFastCometDispatcher = (
  init: RequestInit,
  dispatcher: Dispatcher | undefined
): RequestInit & { dispatcher?: Dispatcher } => {
  return dispatcher !== undefined ? { ...init, dispatcher } : init;
};

const closeFastCometDispatcher = async (dispatcher: Dispatcher | undefined): Promise<void> => {
  if (dispatcher === undefined) return;
  await dispatcher.close().catch(() => undefined);
};

const createAuthHeaders = (authToken: string | null): Headers => {
  const headers = new Headers();
  if (authToken !== null && authToken.length > 0) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }
  return headers;
};

const appendOptionalFormField = (form: FormData, key: string, value: string | null): void => {
  if (value !== null && value.length > 0) form.append(key, value);
};

const createUploadForm = (params: {
  buffer: Buffer;
  filename: string;
  mimetype: string;
  publicPath: string;
  category: string | null;
  projectId: string | null;
  folder: string | null;
}): FormData => {
  const form = new FormData();
  form.append(
    'file',
    new Blob([new Uint8Array(params.buffer)], {
      type: params.mimetype.length > 0 ? params.mimetype : 'application/octet-stream',
    }),
    params.filename
  );
  form.append('filename', params.filename);
  form.append('publicPath', params.publicPath);
  appendOptionalFormField(form, 'category', params.category);
  appendOptionalFormField(form, 'projectId', params.projectId);
  appendOptionalFormField(form, 'folder', params.folder);
  return form;
};

const resolveUploadResponsePath = (
  responseBody: unknown,
  fastComet: FastCometStorageConfig,
  publicPath: string
): string => {
  if (isRecord(responseBody)) {
    const payload = responseBody;
    const candidates = [
      payload['url'],
      payload['publicUrl'],
      payload['filepath'],
      payload['fileUrl'],
      payload['path'],
      payload['location'],
    ];

    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim().length > 0) {
        return toAbsoluteUrl(candidate.trim(), fastComet.baseUrl);
      }
    }
  }

  if (fastComet.baseUrl.length > 0) {
    return toAbsoluteUrl(publicPath, fastComet.baseUrl);
  }

  throw new Error(
    'FastComet upload succeeded but no file URL was returned. Provide baseUrl or return url/filepath in the response.'
  );
};

export const uploadToFastComet = async (params: {
  buffer: Buffer;
  filename: string;
  mimetype: string;
  publicPath: string;
  category: string | null;
  projectId: string | null;
  folder: string | null;
  fastComet: FastCometStorageConfig;
}): Promise<string> => {
  const { fastComet } = params;
  if (fastComet.uploadEndpoint.length === 0) {
    throw new Error(
      'FastComet storage is enabled but uploadEndpoint is empty. Configure fastcomet_storage_config_v1.'
    );
  }

  const dispatcher = createFastCometDispatcher(fastComet);
  try {
    const response = await withTimeout(fastComet.timeoutMs, async (signal: AbortSignal) =>
      fetch(
        fastComet.uploadEndpoint,
        withFastCometDispatcher(
          {
            method: 'POST',
            headers: createAuthHeaders(fastComet.authToken),
            body: createUploadForm(params),
            signal,
            cache: 'no-store',
          },
          dispatcher
        )
      )
    );

    if (!response.ok) {
      throw new Error(
        `FastComet upload failed (${response.status}). ${await readFastCometFailureBody(response)}`.trim()
      );
    }

    const responseBody = await readFastCometJsonSuccessBody(response, 'upload');
    return resolveUploadResponsePath(responseBody, fastComet, params.publicPath);
  } finally {
    await closeFastCometDispatcher(dispatcher);
  }
};

export const deleteFromFastComet = async (params: {
  filepath: string;
  publicPath: string | null;
  fastComet: FastCometStorageConfig;
}): Promise<void> => {
  const endpoint = params.fastComet.deleteEndpoint;
  if (endpoint === null || endpoint.length === 0) return;

  const headers = createAuthHeaders(params.fastComet.authToken);
  headers.set('Content-Type', 'application/json');
  const dispatcher = createFastCometDispatcher(params.fastComet);
  try {
    const response = await withTimeout(params.fastComet.timeoutMs, async (signal: AbortSignal) =>
      fetch(
        endpoint,
        withFastCometDispatcher(
          {
            method: 'POST',
            headers,
            body: JSON.stringify({
              filepath: params.filepath,
              publicPath: params.publicPath,
            }),
            signal,
            cache: 'no-store',
          },
          dispatcher
        )
      )
    );
    if (!response.ok) {
      throw new Error(
        `FastComet delete failed (${response.status}). ${await readFastCometFailureBody(response)}`.trim()
      );
    }
    if (response.status !== 204) {
      await readFastCometJsonSuccessBody(response, 'delete');
    }
  } finally {
    await closeFastCometDispatcher(dispatcher);
  }
};
