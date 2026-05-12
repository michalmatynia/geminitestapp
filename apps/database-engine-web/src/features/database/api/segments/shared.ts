import { type ApiPayloadResult } from '@/shared/contracts/http';
import { ApiError } from '@/shared/lib/api-client';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { type DatabaseType } from '@/shared/contracts/database';

export const withDbTypeQuery = (endpoint: string, dbType?: DatabaseType): string => {
  if (dbType === undefined) return endpoint;
  return `${endpoint}?type=${encodeURIComponent(dbType)}`;
};

export const toFallbackErrorPayload = (error: unknown): { error: string } => ({
  error: error instanceof Error ? error.message : String(error),
});

export const wrapInApiPayloadResult = async <T>(promise: Promise<T>): Promise<ApiPayloadResult<T>> => {
  try {
    const data = await promise;
    return { ok: true, payload: data };
  } catch (error) {
    logClientError(error);
    if (error instanceof ApiError) {
      if (error.payload !== undefined && error.payload !== null) {
        return { ok: false, payload: error.payload as T };
      }
      return { ok: false, payload: toFallbackErrorPayload(error) };
    }
    return { ok: false, payload: toFallbackErrorPayload(error) };
  }
};
