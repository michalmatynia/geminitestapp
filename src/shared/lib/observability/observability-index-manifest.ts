import type { CreateIndexesOptions, IndexSpecification } from 'mongodb';

import {
  OBSERVABILITY_ACTIVITY_LOG_RETENTION_SECONDS,
  OBSERVABILITY_ACTIVITY_LOG_TTL_INDEX_NAME,
  OBSERVABILITY_SYSTEM_LOG_RETENTION_SECONDS,
  OBSERVABILITY_SYSTEM_LOG_TTL_INDEX_NAME,
} from '@/shared/lib/observability/observability-retention';

export type ObservabilityIndexManifestEntry = {
  collection: string;
  key: IndexSpecification;
  options?: CreateIndexesOptions;
};

export const OBSERVABILITY_INDEX_MANIFEST: readonly ObservabilityIndexManifestEntry[] = [
  { collection: 'system_logs', key: { createdAt: -1 } },
  { collection: 'system_logs', key: { level: 1, createdAt: -1 } },
  { collection: 'system_logs', key: { source: 1, createdAt: -1 } },
  { collection: 'system_logs', key: { service: 1, createdAt: -1 } },
  { collection: 'system_logs', key: { path: 1, createdAt: -1 } },
  { collection: 'system_logs', key: { requestId: 1 } },
  { collection: 'system_logs', key: { traceId: 1 } },
  { collection: 'system_logs', key: { traceId: 1, createdAt: -1 } },
  { collection: 'system_logs', key: { correlationId: 1 } },
  { collection: 'system_logs', key: { 'context.fingerprint': 1 } },
  { collection: 'system_logs', key: { userId: 1 } },
  {
    collection: 'system_logs',
    key: { createdAt: 1 },
    options: {
      name: OBSERVABILITY_SYSTEM_LOG_TTL_INDEX_NAME,
      expireAfterSeconds: OBSERVABILITY_SYSTEM_LOG_RETENTION_SECONDS,
    },
  },
  { collection: 'activity_logs', key: { createdAt: -1 } },
  { collection: 'activity_logs', key: { type: 1, createdAt: -1 } },
  { collection: 'activity_logs', key: { userId: 1, createdAt: -1 } },
  { collection: 'activity_logs', key: { entityId: 1, createdAt: -1 } },
  { collection: 'activity_logs', key: { entityType: 1, createdAt: -1 } },
  { collection: 'activity_logs', key: { userId: 1, entityId: 1, createdAt: -1 } },
  {
    collection: 'activity_logs',
    key: { createdAt: 1 },
    options: {
      name: OBSERVABILITY_ACTIVITY_LOG_TTL_INDEX_NAME,
      expireAfterSeconds: OBSERVABILITY_ACTIVITY_LOG_RETENTION_SECONDS,
    },
  },
] as const;

export const getObservabilityIndexManifestEntries = (
  collection: string
): ObservabilityIndexManifestEntry[] =>
  OBSERVABILITY_INDEX_MANIFEST.filter((entry) => entry.collection === collection).map((entry) => ({
    collection: entry.collection,
    key: entry.key,
    ...(entry.options ? { options: entry.options } : {}),
  }));

export const buildObservabilityExpectedByCollection = (): Record<
  string,
  Array<{ key: IndexSpecification; options?: CreateIndexesOptions }>
> =>
  OBSERVABILITY_INDEX_MANIFEST.reduce<
    Record<string, Array<{ key: IndexSpecification; options?: CreateIndexesOptions }>>
  >(
    (acc, entry) => {
      const nextEntry = {
        key: entry.key,
        ...(entry.options ? { options: entry.options } : {}),
      };

      return {
        ...acc,
        [entry.collection]: [...(acc[entry.collection] ?? []), nextEntry],
      };
    },
    {}
  );
