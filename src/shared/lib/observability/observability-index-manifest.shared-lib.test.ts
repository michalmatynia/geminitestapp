import { describe, expect, it } from 'vitest';

import {
  OBSERVABILITY_INDEX_MANIFEST,
  buildObservabilityExpectedByCollection,
} from '@/shared/lib/observability/observability-index-manifest';

describe('observability-index-manifest shared-lib coverage', () => {
  it('defines the expected observability index manifest entries', () => {
    expect(OBSERVABILITY_INDEX_MANIFEST).toEqual(
      expect.arrayContaining([
        { collection: 'system_logs', key: { createdAt: -1 } },
        { collection: 'system_logs', key: { traceId: 1, createdAt: -1 } },
        { collection: 'activity_logs', key: { userId: 1, entityId: 1, createdAt: -1 } },
      ])
    );
    expect(OBSERVABILITY_INDEX_MANIFEST).toHaveLength(17);
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
      ],
      activity_logs: [
        { key: { createdAt: -1 } },
        { key: { type: 1, createdAt: -1 } },
        { key: { userId: 1, createdAt: -1 } },
        { key: { entityId: 1, createdAt: -1 } },
        { key: { entityType: 1, createdAt: -1 } },
        { key: { userId: 1, entityId: 1, createdAt: -1 } },
      ],
    });
  });
});
