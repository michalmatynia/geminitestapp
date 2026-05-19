import { describe, expect, it } from 'vitest';
import {
  seedCanonicalStarterWorkflows,
  ensureCanonicalStarterWorkflowRecordsForPathIds,
} from '@/features/ai/ai-paths/server/starter-workflows-settings';
import {
  SOCIAL_ARTICLE_AGGREGATION_PATH_ID,
  SOCIAL_ARTICLE_AGGREGATION_TRIGGER_EVENT,
} from '@/shared/lib/ai-paths/social-article-aggregation';
import { loadStoredPathConfig } from '@/shared/lib/ai-paths/core/utils/stored-path-config';

describe('canonical seeded path configs', () => {
  it('path_descv3lite seed is canonical', () => {
    const { nextRecords } = seedCanonicalStarterWorkflows([]);
    const record = nextRecords.find((r) => r.key.includes('path_descv3lite'));
    expect(record).toBeDefined();
    const result = loadStoredPathConfig({ pathId: 'path_descv3lite', rawConfig: record!.value });
    expect(result.changed).toBe(false);
  });

  it('social article aggregation seed is canonical', () => {
    const { nextRecords } = seedCanonicalStarterWorkflows([]);
    const record = nextRecords.find((r) => r.key.includes(SOCIAL_ARTICLE_AGGREGATION_PATH_ID));
    expect(record).toBeDefined();
    const result = loadStoredPathConfig({
      pathId: SOCIAL_ARTICLE_AGGREGATION_PATH_ID,
      rawConfig: record!.value,
    });
    const triggerNode = result.config.nodes.find((node) => node.type === 'trigger');

    expect(result.changed).toBe(false);
    expect(result.config.id).toBe(SOCIAL_ARTICLE_AGGREGATION_PATH_ID);
    expect(triggerNode?.config?.trigger?.event).toBe(SOCIAL_ARTICLE_AGGREGATION_TRIGGER_EVENT);
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

  it('ensureCanonicalStarterWorkflowRecordsForPathIds restores the social article aggregation starter', () => {
    const { nextRecords: seedRecords } = seedCanonicalStarterWorkflows([]);
    const configKey =
      seedRecords.find((r) => r.key.includes(SOCIAL_ARTICLE_AGGREGATION_PATH_ID))?.key ?? '';

    const staleRecord = {
      key: configKey,
      value: JSON.stringify({
        edges: [],
        id: SOCIAL_ARTICLE_AGGREGATION_PATH_ID,
        isActive: true,
        isLocked: false,
        name: 'Social Article Aggregation',
        nodes: [],
        updatedAt: '2026-05-19T00:00:00.000Z',
      }),
    };

    const result = ensureCanonicalStarterWorkflowRecordsForPathIds(
      [staleRecord],
      [SOCIAL_ARTICLE_AGGREGATION_PATH_ID]
    );
    expect(result.affectedCount).toBeGreaterThan(0);

    const fixedRecord = result.nextRecords.find((r) => r.key === configKey);
    expect(fixedRecord).toBeDefined();
    const canonical = loadStoredPathConfig({
      pathId: SOCIAL_ARTICLE_AGGREGATION_PATH_ID,
      rawConfig: fixedRecord!.value,
    });
    const triggerNode = canonical.config.nodes.find((node) => node.type === 'trigger');

    expect(canonical.changed).toBe(false);
    expect(triggerNode?.config?.trigger?.event).toBe(SOCIAL_ARTICLE_AGGREGATION_TRIGGER_EVENT);
  });
});
