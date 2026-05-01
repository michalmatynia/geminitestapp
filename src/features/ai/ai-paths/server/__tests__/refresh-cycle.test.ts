import { describe, expect, it } from 'vitest';

import { refreshStarterWorkflowConfigs } from '@/features/ai/ai-paths/server/starter-workflows-settings';
import { seedCanonicalStarterWorkflows } from '@/features/ai/ai-paths/server/starter-workflows-settings';

const DESCV3LITE_PATH_ID = 'path_descv3lite';
const TRANSLATION_PATH_ID = 'path_96708d';

describe('refresh_starter_workflow_configs cycle check', () => {
  const buildSeedRecords = () => {
    const seed = seedCanonicalStarterWorkflows([]);
    return seed.nextRecords;
  };

  it('refresh is idempotent after first run for path_descv3lite', () => {
    const records = buildSeedRecords();
    const descRecord = records.find((r) => r.key.includes(DESCV3LITE_PATH_ID));
    if (!descRecord) {
      console.log('path_descv3lite not found in seed records — skipping');
      return;
    }

    // First refresh
    const result1 = refreshStarterWorkflowConfigs([descRecord]);
    console.log('First refresh affectedCount:', result1.affectedCount);

    if (result1.affectedCount === 0) {
      console.log('No refresh needed on initial seed — testing idempotency directly');
      const result2 = refreshStarterWorkflowConfigs(result1.nextRecords);
      expect(result2.affectedCount).toBe(0);
      return;
    }

    // Second refresh (should be idempotent)
    const result2 = refreshStarterWorkflowConfigs(result1.nextRecords);
    console.log('Second refresh affectedCount:', result2.affectedCount);
    expect(result2.affectedCount).toBe(0);
  });

  it('refresh is idempotent after first run for path_96708d', () => {
    const records = buildSeedRecords();
    const translRecord = records.find((r) => r.key.includes(TRANSLATION_PATH_ID));
    if (!translRecord) {
      console.log('path_96708d not found in seed records — skipping');
      return;
    }

    const result1 = refreshStarterWorkflowConfigs([translRecord]);
    console.log('First refresh affectedCount:', result1.affectedCount);

    if (result1.affectedCount === 0) {
      console.log('No refresh needed on initial seed — testing idempotency directly');
      const result2 = refreshStarterWorkflowConfigs(result1.nextRecords);
      expect(result2.affectedCount).toBe(0);
      return;
    }

    const result2 = refreshStarterWorkflowConfigs(result1.nextRecords);
    console.log('Second refresh affectedCount:', result2.affectedCount);
    expect(result2.affectedCount).toBe(0);
  });

  it('simulates stored config with mismatched node timestamps and checks idempotency', () => {
    const records = buildSeedRecords();

    // Simulate a config with stale node timestamps (like what exists in production)
    const descRecord = records.find((r) => r.key.includes(DESCV3LITE_PATH_ID));
    const translRecord = records.find((r) => r.key.includes(TRANSLATION_PATH_ID));

    for (const [label, record] of [[DESCV3LITE_PATH_ID, descRecord], [TRANSLATION_PATH_ID, translRecord]] as const) {
      if (!record) continue;

      // Inject stale timestamps into nodes (simulate what's in production DB)
      const cfg = JSON.parse(record.value) as Record<string, unknown>;
      const nodes = (cfg['nodes'] as Record<string, unknown>[]) ?? [];
      const staleCfg = {
        ...cfg,
        nodes: nodes.map((n) => ({ ...n, createdAt: '2026-04-25T19:42:37.408Z', updatedAt: '2026-04-25T19:42:37.408Z' })),
      };
      const staleRecord = { ...record, value: JSON.stringify(staleCfg) };

      // First refresh
      const result1 = refreshStarterWorkflowConfigs([staleRecord]);
      console.log(`[${label}] First refresh affectedCount:`, result1.affectedCount);

      // Second refresh — must be idempotent
      const result2 = refreshStarterWorkflowConfigs(result1.nextRecords);
      console.log(`[${label}] Second refresh affectedCount:`, result2.affectedCount);
      expect(result2.affectedCount).toBe(0);
    }
  });
});
