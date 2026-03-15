import { RuntimePortValues, AdvancedApiConfig } from '@/shared/contracts/ai-paths';
import { NodeHandlerContext } from '@/shared/contracts/ai-paths-runtime';

import { JsonRecord } from './config';
import { getValueAtMappingPath, safeStringify } from '../../utils';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


export const toObject = (value: unknown): JsonRecord => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as JsonRecord;
};

export const toStringRecord = (value: unknown): Record<string, string> => {
  const source = toObject(value);
  const result: Record<string, string> = {};
  Object.entries(source).forEach(([key, entry]) => {
    if (!key.trim()) return;
    if (entry === null || entry === undefined) return;
    result[key] = String(entry);
  });
  return result;
};

export const toNumberArray = (value: unknown): number[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry: unknown) =>
      typeof entry === 'number'
        ? entry
        : Number.parseInt(typeof entry === 'string' ? entry : '', 10)
    )
    .filter((entry: number): entry is number => Number.isFinite(entry))
    .map((entry: number) => Math.trunc(entry));
};

export const parseJsonWithTemplates = <T>(
  raw: string | undefined,
  nodeInputs: RuntimePortValues,
  fallback: T,
  reportAiPathsError: NodeHandlerContext['reportAiPathsError'],
  meta: Record<string, unknown>
): T => {
  if (typeof raw !== 'string' || raw.trim().length === 0) return fallback;
  const renderedWithValue = raw.replace(
    /{{\s*([^}]+)\s*}}/g,
    (_match: string, token: string): string => {
      const key = String(token).trim();
      if (!key) return '';
      if (key === 'value' || key === 'current') {
        return safeStringify(nodeInputs['value']);
      }
      return safeStringify(getValueAtMappingPath(nodeInputs, key));
    }
  );
  try {
    return JSON.parse(renderedWithValue) as T;
  } catch (error) {
    logClientError(error);
    reportAiPathsError(error, meta, 'Invalid advanced API JSON config:');
    return fallback;
  }
};

export const applyPathParams = (url: string, params: Record<string, string>): string => {
  let next = url;
  Object.entries(params).forEach(([key, value]) => {
    if (!key) return;
    const encoded = encodeURIComponent(value);
    next = next.replaceAll(`:${key}`, encoded).replaceAll(`{${key}}`, encoded);
  });
  return next;
};

export const appendQueryParams = (url: string, queryParams: Record<string, string>): string => {
  const entries = Object.entries(queryParams).filter(
    ([key, value]) => key.trim().length > 0 && value.length > 0
  );
  if (entries.length === 0) return url;
  const hasQuery = url.includes('?');
  const params = new URLSearchParams(hasQuery ? url.slice(url.indexOf('?') + 1) : '');
  entries.forEach(([key, value]) => {
    params.set(key, value);
  });
  const base = hasQuery ? url.slice(0, url.indexOf('?')) : url;
  const query = params.toString();
  return query.length > 0 ? `${base}?${query}` : base;
};

export const sleep = async (ms: number): Promise<void> => {
  if (!Number.isFinite(ms) || ms <= 0) return;
  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
};

export const resolveRetryDelay = (attempt: number, config: AdvancedApiConfig): number => {
  const base = Math.max(0, Math.trunc(config.retryBackoffMs ?? 0));
  if (base <= 0) return 0;
  const max = Math.max(base, Math.trunc(config.retryMaxBackoffMs ?? base));
  const strategy = config.retryBackoff ?? 'fixed';
  const step =
    strategy === 'exponential' ? Math.min(max, base * Math.pow(2, Math.max(0, attempt - 1))) : base;
  const jitterRatio = Math.max(0, Math.min(1, config.retryJitterRatio ?? 0));
  if (jitterRatio <= 0) return step;
  const jitter = Math.round(step * jitterRatio * Math.random());
  return Math.min(max, step + jitter);
};

export const buildMappedOutputs = (
  outputMappings: Record<string, string>,
  envelope: JsonRecord
): RuntimePortValues => {
  const outputs: RuntimePortValues = {};
  Object.entries(outputMappings).forEach(([port, path]) => {
    if (!port.trim() || typeof path !== 'string' || !path.trim()) return;
    const value = getValueAtMappingPath(envelope, path);
    outputs[port] = value;
  });
  return outputs;
};

export type SignalControl = {
  signal: AbortSignal | undefined;
  wasTimeout: () => boolean;
  cleanup: () => void;
};

export const createSignalControl = (
  baseSignal: AbortSignal | undefined,
  timeoutMs: number | undefined
): SignalControl => {
  const normalizedTimeout = Number.isFinite(timeoutMs ?? NaN)
    ? Math.max(0, Math.trunc(timeoutMs as number))
    : 0;

  if (!baseSignal && normalizedTimeout <= 0) {
    return {
      signal: undefined,
      wasTimeout: () => false,
      cleanup: () => undefined,
    };
  }

  const controller = new AbortController();
  let timeoutTriggered = false;
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  const handleBaseAbort = (): void => {
    controller.abort();
  };

  if (baseSignal) {
    if (baseSignal.aborted) {
      controller.abort();
    } else {
      baseSignal.addEventListener('abort', handleBaseAbort);
    }
  }

  if (normalizedTimeout > 0) {
    timeoutHandle = setTimeout(() => {
      timeoutTriggered = true;
      controller.abort();
    }, normalizedTimeout);
  }

  return {
    signal: controller.signal,
    wasTimeout: () => timeoutTriggered,
    cleanup: () => {
      if (baseSignal) {
        baseSignal.removeEventListener('abort', handleBaseAbort);
      }
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    },
  };
};
