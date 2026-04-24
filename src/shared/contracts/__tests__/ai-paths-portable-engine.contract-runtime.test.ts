import { describe, expect, it } from 'vitest';

import {
  portablePathJsonSchemaKindQuerySchema,
  portablePathTrendSnapshotsQuerySchema,
} from '@/shared/contracts/ai-paths-portable-engine';

describe('ai paths portable engine contract runtime', () => {
  it('parses portable schema kind query DTOs', () => {
    expect(portablePathJsonSchemaKindQuerySchema.parse({ kind: 'portable_package' })).toEqual({
      kind: 'portable_package',
    });
    expect(portablePathJsonSchemaKindQuerySchema.parse({})).toEqual({});
  });

  it('parses trend snapshots query DTOs', () => {
    expect(
      portablePathTrendSnapshotsQuerySchema.parse({
        limit: '25',
        trigger: 'threshold',
        from: '2026-03-01T00:00:00.000Z',
        to: '2026-03-02T00:00:00.000Z',
        cursor: 'cursor-token',
      })
    ).toEqual({
      limit: '25',
      trigger: 'threshold',
      from: '2026-03-01T00:00:00.000Z',
      to: '2026-03-02T00:00:00.000Z',
      cursor: 'cursor-token',
    });
  });
});
