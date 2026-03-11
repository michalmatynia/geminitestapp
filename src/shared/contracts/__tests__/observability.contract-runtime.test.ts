import { describe, expect, it } from 'vitest';

import {
  mongoDiagnosticsResponseSchema,
  mongoRebuildIndexesResponseSchema,
} from '@/shared/contracts/observability';

const sampleCollection = {
  name: 'system_logs',
  expected: [{ name: 'createdAt_1', key: { createdAt: 1 } }],
  existing: [{ name: 'createdAt_1', key: { createdAt: 1 } }],
  missing: [],
  extra: [],
};

describe('observability contract runtime', () => {
  it('parses mongo diagnostics responses', () => {
    expect(
      mongoDiagnosticsResponseSchema.parse({
        generatedAt: '2026-03-11T13:00:00.000Z',
        collections: [sampleCollection],
      }).collections
    ).toHaveLength(1);
  });

  it('parses mongo index rebuild responses', () => {
    const parsed = mongoRebuildIndexesResponseSchema.parse({
      generatedAt: '2026-03-11T13:05:00.000Z',
      created: [{ collection: 'system_logs', key: { createdAt: 1 } }],
      collections: [sampleCollection],
    });

    expect(parsed.created[0]?.collection).toBe('system_logs');
    expect(parsed.collections[0]?.name).toBe('system_logs');
  });
});
