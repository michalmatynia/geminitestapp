import type { RuntimeState } from '@/shared/contracts/ai-paths';
import {
  parserSampleStateSchema,
  type ParserSampleState,
  updaterSampleStateSchema,
  type UpdaterSampleState,
} from '@/shared/contracts/ai-paths-core/nodes';
import { runtimeStateSchema } from '@/shared/contracts/ai-paths-runtime';
import { isAppError, validationError } from '@/shared/errors/app-error';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

export const EMPTY_RUNTIME_STATE: RuntimeState = {
  status: 'idle',
  nodeStatuses: {},
  nodeOutputs: {},
  variables: {},
  events: [],
  currentRun: null,
  inputs: {},
  outputs: {},
};

const assertNoUnsupportedRunIdentity = (
  record: Record<string, unknown>,
  location: string
): void => {
  const unsupportedKeys = ['runId', 'runStartedAt'].filter((key: string): boolean => key in record);
  if (unsupportedKeys.length === 0) return;
  throw validationError('AI Paths runtime state payload includes unsupported identity fields.', {
    reason: 'unsupported_runtime_identity_fields',
    keys: unsupportedKeys,
    location,
  });
};

const assertNoUnsupportedRuntimeIdentityFields = (parsed: Record<string, unknown>): void => {
  assertNoUnsupportedRunIdentity(parsed, 'runtime_state');

  const events = parsed['events'];
  if (Array.isArray(events)) {
    events.forEach((entry: unknown, index: number): void => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return;
      assertNoUnsupportedRunIdentity(entry as Record<string, unknown>, `events[${index}]`);
    });
  }

  const history = parsed['history'];
  if (!history || typeof history !== 'object' || Array.isArray(history)) return;
  Object.entries(history as Record<string, unknown>).forEach(
    ([nodeId, entries]: [string, unknown]): void => {
      if (!Array.isArray(entries)) return;
      entries.forEach((entry: unknown, index: number): void => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return;
        assertNoUnsupportedRunIdentity(
          entry as Record<string, unknown>,
          `history.${nodeId}[${index}]`
        );
      });
    }
  );
};

const pruneNonCanonicalRuntimeHistoryStrategy = (parsed: Record<string, unknown>): void => {
  const history = parsed['history'];
  if (!history || typeof history !== 'object' || Array.isArray(history)) return;

  Object.values(history as Record<string, unknown>).forEach((entries: unknown): void => {
    if (!Array.isArray(entries)) return;
    entries.forEach((entry: unknown): void => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return;
      const record = entry as Record<string, unknown>;
      if (record['runtimeStrategy'] !== 'code_object_v3') {
        delete record['runtimeStrategy'];
      }
    });
  });
};

const normalizeParsedRuntimeState = (parsed: Record<string, unknown>): RuntimeState => {
  assertNoUnsupportedRuntimeIdentityFields(parsed);
  pruneNonCanonicalRuntimeHistoryStrategy(parsed);
  const merged = {
    ...EMPTY_RUNTIME_STATE,
    ...parsed,
  };
  const validated = runtimeStateSchema.safeParse(merged);
  if (!validated.success) {
    throw validationError('Invalid AI Paths runtime state payload.', {
      reason: 'schema_validation_failed',
      issues: validated.error.flatten(),
    });
  }
  return validated.data as RuntimeState;
};

export const parseRuntimeState = (value: unknown): RuntimeState => {
  if (!value) return EMPTY_RUNTIME_STATE;

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return normalizeParsedRuntimeState(parsed as Record<string, unknown>);
      }
      throw validationError('Invalid AI Paths runtime state payload.', {
        reason: 'invalid_shape',
      });
    } catch (error) {
      logClientError(error);
      if (isAppError(error)) {
        throw error;
      }
      throw validationError('Invalid AI Paths runtime state payload.', {
        reason: 'json_parse_failed',
        cause: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    return normalizeParsedRuntimeState(value as Record<string, unknown>);
  }

  throw validationError('Invalid AI Paths runtime state payload.', {
    reason: 'invalid_shape',
  });
};

const normalizeSampleRecord = <TSample>(
  value: unknown,
  parseSample: (sample: unknown) => TSample | null
): Record<string, TSample> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const normalized: Record<string, TSample> = {};
  Object.entries(value as Record<string, unknown>).forEach(([key, sampleValue]) => {
    const normalizedKey = key.trim();
    if (!normalizedKey) return;
    const parsed = parseSample(sampleValue);
    if (!parsed) return;
    normalized[normalizedKey] = parsed;
  });
  return normalized;
};

export const normalizeParserSamples = (value: unknown): Record<string, ParserSampleState> =>
  normalizeSampleRecord(value, (sample: unknown): ParserSampleState | null => {
    const parsed = parserSampleStateSchema.safeParse(sample);
    return parsed.success ? parsed.data : null;
  });

export const normalizeUpdaterSamples = (value: unknown): Record<string, UpdaterSampleState> =>
  normalizeSampleRecord(value, (sample: unknown): UpdaterSampleState | null => {
    const parsed = updaterSampleStateSchema.safeParse(sample);
    return parsed.success ? parsed.data : null;
  });
