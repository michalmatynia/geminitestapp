import { describe, expect, it } from 'vitest';

import {
  OBSERVABILITY_INDEX_MANIFEST,
  buildObservabilityExpectedByCollection,
} from '@/shared/lib/observability/observability-index-manifest';
import {
  OBSERVABILITY_ACTIVITY_LOG_RETENTION_SECONDS,
  OBSERVABILITY_ACTIVITY_LOG_TTL_INDEX_NAME,
  OBSERVABILITY_SYSTEM_LOG_RETENTION_SECONDS,
  OBSERVABILITY_SYSTEM_LOG_TTL_INDEX_NAME,
} from '@/shared/lib/observability/observability-retention';

describe('observability-index-manifest shared-lib coverage', () => {
  it('defines the expected observability index manifest entries', () => {
    expect(OBSERVABILITY_INDEX_MANIFEST).toEqual(
      expect.arrayContaining([
        { collection: 'system_logs', key: { createdAt: -1 } },
        { collection: 'system_logs', key: { traceId: 1, createdAt: -1 } },
        { collection: 'activity_logs', key: { userId: 1, entityId: 1, createdAt: -1 } },
        {
          collection: 'system_logs',
          key: { createdAt: 1 },
          options: {
            name: OBSERVABILITY_SYSTEM_LOG_TTL_INDEX_NAME,
            expireAfterSeconds: OBSERVABILITY_SYSTEM_LOG_RETENTION_SECONDS,
          },
        },
        {
          collection: 'activity_logs',
          key: { createdAt: 1 },
          options: {
            name: OBSERVABILITY_ACTIVITY_LOG_TTL_INDEX_NAME,
            expireAfterSeconds: OBSERVABILITY_ACTIVITY_LOG_RETENTION_SECONDS,
          },
        },
      ])
    );
    expect(OBSERVABILITY_INDEX_MANIFEST).toHaveLength(19);
  });

  it('groups manifest entries by collection for index assertions', () => {
    expect(buildObservabilityExpectedByCollection()).toEqual({
      system_logs: [
        { key: { createdAt: -1 } },
        { key: { level: 1, createdAt: -1 } },
        { key: { source: 1, createdAt: -1 } },
        { key: { service: 1, createdAt: -1 } },
        { key: { path: 1, createdAt: -1 } },
        { key: { requestId: 1 } },
        { key: { traceId: 1 } },
        { key: { traceId: 1, createdAt: -1 } },
        { key: { correlationId: 1 } },
        { key: { 'context.fingerprint': 1 } },
        { key: { userId: 1 } },
        {
          key: { createdAt: 1 },
          options: {
            name: OBSERVABILITY_SYSTEM_LOG_TTL_INDEX_NAME,
            expireAfterSeconds: OBSERVABILITY_SYSTEM_LOG_RETENTION_SECONDS,
          },
        },
      ],
      activity_logs: [
        { key: { createdAt: -1 } },
        { key: { type: 1, createdAt: -1 } },
        { key: { userId: 1, createdAt: -1 } },
        { key: { entityId: 1, createdAt: -1 } },
        { key: { entityType: 1, createdAt: -1 } },
        { key: { userId: 1, entityId: 1, createdAt: -1 } },
        {
          key: { createdAt: 1 },
          options: {
            name: OBSERVABILITY_ACTIVITY_LOG_TTL_INDEX_NAME,
            expireAfterSeconds: OBSERVABILITY_ACTIVITY_LOG_RETENTION_SECONDS,
          },
        },
      ],
    });
  });
});
