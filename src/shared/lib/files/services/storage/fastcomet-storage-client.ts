import 'server-only';

import type { LookupFunction } from 'node:net';
import { Agent, type Dispatcher } from 'undici';

import type { FastCometStorageConfig } from '@/shared/lib/files/constants';
import { badRequestError, configurationError, externalServiceError } from '@/shared/errors/app-error';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { normalizeFastCometIpAddress } from './fastcomet-storage-config';
import { readFastCometFailureBody, readFastCometJsonSuccessBody } from './fastcomet-response';

const UPLOADS_PREFIX = '/uploads/';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export { resolveFastCometConfig } from './fastcomet-storage-config';

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
  const resolveIp = normalizeFastCometIpAddress(fastComet.resolveIp);
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
    throw configurationError(
      'FastComet storage is enabled but uploadEndpoint is empty. Configure fastcomet_storage_config_v1.',
      { configKey: 'fastcomet_storage_config_v1' }
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
      const body = await readFastCometFailureBody(response);
      throw externalServiceError(
        `FastComet upload failed with status ${response.status}.`,
        {
          status: response.status,
          responseBody: body,
          uploadEndpoint: fastComet.uploadEndpoint,
          filename: params.filename,
        }
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
