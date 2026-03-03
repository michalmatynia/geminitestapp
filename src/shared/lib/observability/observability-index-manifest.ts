import type { IndexSpecification } from 'mongodb';

export type ObservabilityIndexManifestEntry = {
  collection: string;
  key: IndexSpecification;
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
  { collection: 'activity_logs', key: { createdAt: -1 } },
  { collection: 'activity_logs', key: { type: 1, createdAt: -1 } },
  { collection: 'activity_logs', key: { userId: 1, createdAt: -1 } },
  { collection: 'activity_logs', key: { entityId: 1, createdAt: -1 } },
  { collection: 'activity_logs', key: { entityType: 1, createdAt: -1 } },
] as const;

export const buildObservabilityExpectedByCollection = (): Record<
  string,
  Array<{ key: IndexSpecification }>
> =>
  OBSERVABILITY_INDEX_MANIFEST.reduce<Record<string, Array<{ key: IndexSpecification }>>>(
    (acc, entry) => {
      const existing = acc[entry.collection] ?? [];
      existing.push({ key: entry.key });
      acc[entry.collection] = existing;
      return acc;
    },
    {}
  );
