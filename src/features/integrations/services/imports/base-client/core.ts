import type { BaseApiResponse, BaseApiRawResult } from '@/shared/contracts/integrations';
import { externalServiceError } from '@/shared/errors/app-error';
import { withTransientRecovery } from '@/shared/lib/observability/transient-recovery/with-recovery';

import {
  BASE_API_TIMEOUT_MS,
  BASE_API_PRODUCT_WRITE_TIMEOUT_MS,
  BASE_API_IMAGE_TIMEOUT_MS,
  BASE_API_LARGE_PAYLOAD_BYTES,
  buildBaseApiUrl,
} from './config';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

export type { BaseApiRawResult };

export type BaseApiCallOptions = {
  timeoutMs?: number;
  maxAttempts?: number;
};

export const isProductWriteMethod = (method: string): boolean =>
  method === 'addInventoryProduct' || method === 'updateInventoryProduct';

export const hasProductIdentifier = (parameters: Record<string, unknown>): boolean => {
  const value = parameters['product_id'];
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'string') return false;
  return value.trim().length > 0;
};

export const isNonIdempotentProductWriteCall = (
  method: string,
  parameters: Record<string, unknown>
): boolean => method === 'addInventoryProduct' && !hasProductIdentifier(parameters);

export const hasImagePayload = (parameters: Record<string, unknown>): boolean => {
  const images = parameters['images'];
  if (Array.isArray(images)) return images.length > 0;
  if (images && typeof images === 'object') return Object.keys(images).length > 0;
  return false;
};

export const estimatePayloadSizeBytes = (parameters: Record<string, unknown>): number => {
  try {
    let total = 0;
    for (const key in parameters) {
      if (!Object.prototype.hasOwnProperty.call(parameters, key)) continue;
      total += key.length + 4;
      const val = parameters[key];
      if (typeof val === 'string') total += val.length;
      else if (typeof val === 'number') total += 8;
      else if (typeof val === 'boolean') total += 4;
      else if (val && typeof val === 'object') {
        total += 100;
      }
    }
    return total;
  } catch (error) {
    logClientError(error);
    return 0;
  }
};

export const resolveBaseApiTimeoutMs = (
  method: string,
  parameters: Record<string, unknown>,
  options?: BaseApiCallOptions
): number => {
  if (
    typeof options?.timeoutMs === 'number' &&
    Number.isFinite(options.timeoutMs) &&
    options.timeoutMs > 0
  ) {
    return Math.round(options.timeoutMs);
  }

  if (!isProductWriteMethod(method)) {
    return BASE_API_TIMEOUT_MS;
  }

  if (hasImagePayload(parameters)) {
    return BASE_API_IMAGE_TIMEOUT_MS;
  }

  const payloadBytes = estimatePayloadSizeBytes(parameters);
  if (payloadBytes >= BASE_API_LARGE_PAYLOAD_BYTES) {
    return Math.max(BASE_API_PRODUCT_WRITE_TIMEOUT_MS, BASE_API_IMAGE_TIMEOUT_MS);
  }

  return BASE_API_PRODUCT_WRITE_TIMEOUT_MS;
};

export async function callBaseApi(
  token: string,
  method: string,
  parameters: Record<string, unknown> = {},
  options?: BaseApiCallOptions
): Promise<BaseApiResponse> {
  const timeoutMs = resolveBaseApiTimeoutMs(method, parameters, options);
  const maxAttempts =
    options?.maxAttempts ??
    (isNonIdempotentProductWriteCall(method, parameters)
      ? 1
      : isProductWriteMethod(method) || hasImagePayload(parameters)
        ? 2
        : 3);
  const endpoint = buildBaseApiUrl();
  const body = new URLSearchParams({
    token,
    method,
    parameters: JSON.stringify(parameters),
  });
  const response = await withTransientRecovery(
    async (): Promise<Response> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      let res: Response;
      try {
        res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body,
          signal: controller.signal,
        });
      } catch (error: unknown) {
        logClientError(error);
        if (error instanceof Error && error.name === 'AbortError') {
          throw externalServiceError(
            `Base API request timed out after ${timeoutMs}ms.`,
            { method, timeoutMs },
            { retryable: true }
          );
        }
        throw error;
      } finally {
        clearTimeout(timeoutId);
      }
      if (!res.ok) {
        const retryable = res.status >= 500 || res.status === 408 || res.status === 429;
        const retryAfterHeader = res.headers.get('retry-after');
        const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : undefined;
        throw externalServiceError(
          `Base API request failed (${res.status}).`,
          { status: res.status, method },
          {
            retryable,
            ...(retryAfterMs && Number.isFinite(retryAfterMs) ? { retryAfterMs } : {}),
          }
        );
      }
      return res;
    },
    {
      source: 'base-api',
      circuitId: 'base-api',
      retry: {
        maxAttempts,
        initialDelayMs: 800,
        maxDelayMs: 8000,
        timeoutMs: timeoutMs + 2000,
      },
    }
  );
  const payload = (await response.json()) as BaseApiResponse;
  if (payload.status === 'ERROR') {
    const message =
      (typeof payload.error_message === 'string' && payload.error_message) ||
      (typeof payload.error_code === 'string' && payload.error_code) ||
      'Base API error.';
    throw externalServiceError(message, {
      method,
      errorCode: payload.error_code,
    });
  }
  return payload;
}

export async function callBaseApiRaw(
  token: string,
  method: string,
  parameters: Record<string, unknown> = {}
): Promise<BaseApiRawResult> {
  const endpoint = buildBaseApiUrl();
  const body = new URLSearchParams({
    token,
    method,
    parameters: JSON.stringify(parameters),
  });
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  let payload: BaseApiResponse;
  try {
    payload = (await response.json()) as BaseApiResponse;
  } catch (error: unknown) {
    logClientError(error);
    const message = error instanceof Error ? error.message : 'Invalid JSON payload.';
    return {
      ok: false,
      statusCode: response.status,
      payload: null,
      error: message,
    };
  }

  const apiError =
    payload?.status === 'ERROR'
      ? (typeof payload.error_message === 'string' && payload.error_message) ||
        (typeof payload.error_code === 'string' && payload.error_code) ||
        'Base API error.'
      : undefined;

  return {
    ok: response.ok && !apiError,
    statusCode: response.status,
    payload,
    ...(apiError ? { error: apiError } : {}),
  };
}
