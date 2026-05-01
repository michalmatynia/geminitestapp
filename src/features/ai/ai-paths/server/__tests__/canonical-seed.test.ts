import { describe, expect, it } from 'vitest';
import {
  seedCanonicalStarterWorkflows,
  ensureCanonicalStarterWorkflowRecordsForPathIds,
} from '@/features/ai/ai-paths/server/starter-workflows-settings';
import { loadStoredPathConfig } from '@/shared/lib/ai-paths/core/utils/stored-path-config';

describe('canonical seeded path configs', () => {
  it('path_descv3lite seed is canonical', () => {
    const { nextRecords } = seedCanonicalStarterWorkflows([]);
    const record = nextRecords.find((r) => r.key.includes('path_descv3lite'));
    expect(record).toBeDefined();
    const result = loadStoredPathConfig({ pathId: 'path_descv3lite', rawConfig: record!.value });
    expect(result.changed).toBe(false);
  });

  it('ensureCanonicalStarterWorkflowRecordsForPathIds fixes a stale path_descv3lite and produces canonical result', () => {
    const { nextRecords: seedRecords } = seedCanonicalStarterWorkflows([]);
    const configKey = seedRecords.find((r) => r.key.includes('path_descv3lite'))?.key ?? '';

    const staleRecord = {
      key: configKey,
      value: JSON.stringify({
        id: 'path_descv3lite',
        name: 'Description Inference v3 Lite',
        nodes: [],
        edges: [],
        updatedAt: '2026-03-03T00:00:00.000Z',
        isActive: true,
        isLocked: false,
      }),
    };

    const result = ensureCanonicalStarterWorkflowRecordsForPathIds(
      [staleRecord],
      ['path_descv3lite'],
    );
    expect(result.affectedCount).toBeGreaterThan(0);

    const fixedRecord = result.nextRecords.find((r) => r.key === configKey);
    expect(fixedRecord).toBeDefined();
    const canonical = loadStoredPathConfig({
      pathId: 'path_descv3lite',
      rawConfig: fixedRecord!.value,
    });
    expect(canonical.changed).toBe(false);
  });
});
