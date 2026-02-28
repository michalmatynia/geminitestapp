import { describe, expect, it, vi } from 'vitest';

import {
  BASE_EXPORT_BLWO_PATH_ID,
  buildBaseExportBlwoPathConfigValue,
} from '@/features/ai/ai-paths/server/settings-store-base-export-workflow';
import {
  buildDescriptionInferenceLitePathConfigValue,
  DESCRIPTION_INFERENCE_LITE_PATH_ID,
} from '@/features/ai/ai-paths/server/settings-store-description-inference';
import {
  buildParameterInferencePathConfigValue,
  PARAMETER_INFERENCE_PATH_ID,
} from '@/features/ai/ai-paths/server/settings-store-parameter-inference';
import { __testOnly } from '@/features/ai/ai-paths/server/settings-store';

describe('settings-store flag preservation and read-time seeding policy', () => {
  it('preserves path activation and lock flags when seeded defaults are rewritten', () => {
    const timestamp = '2026-02-24T00:00:00.000Z';
    const existingFlags = JSON.stringify({
      id: 'path_custom',
      isActive: false,
      isLocked: true,
    });
    const seededConfigs: Array<{ pathId: string; raw: string }> = [
      {
        pathId: PARAMETER_INFERENCE_PATH_ID,
        raw: buildParameterInferencePathConfigValue(timestamp),
      },
      {
        pathId: DESCRIPTION_INFERENCE_LITE_PATH_ID,
        raw: buildDescriptionInferenceLitePathConfigValue(timestamp),
      },
      {
        pathId: BASE_EXPORT_BLWO_PATH_ID,
        raw: buildBaseExportBlwoPathConfigValue(timestamp),
      },
    ];

    seededConfigs.forEach((seededConfig) => {
      const preservedRaw = __testOnly.preservePathConfigFlagsOnSeed(
        seededConfig.raw,
        existingFlags
      );
      const parsed = JSON.parse(preservedRaw) as Record<string, unknown>;
      expect(parsed['id']).toBe(seededConfig.pathId);
      expect(parsed['isActive']).toBe(false);
      expect(parsed['isLocked']).toBe(true);
    });
  });

  it('does not auto-apply default seed writes during reads by default', async () => {
    const applyDefaultSeeds = vi
      .fn<
        (
          records: Array<{ key: string; value: string }>
        ) => Promise<Array<{ key: string; value: string }>>
      >()
      .mockResolvedValue([]);

    const records = [{ key: 'ai_paths_index', value: '[]' }];
    const next = await __testOnly.maybeAutoApplyDefaultSeedsOnRead(['ai_paths_index'], records, {
      autoApply: false,
      applyDefaultSeeds,
    });

    expect(next).toEqual(records);
    expect(applyDefaultSeeds).not.toHaveBeenCalled();
  });

  it('can explicitly enable read-time default seeds through policy toggle', async () => {
    const records = [{ key: 'ai_paths_index', value: '[]' }];
    const seeded = [{ key: 'ai_paths_index', value: '[{"id":"path_seeded"}]' }];
    const applyDefaultSeeds = vi
      .fn<
        (
          items: Array<{ key: string; value: string }>
        ) => Promise<Array<{ key: string; value: string }>>
      >()
      .mockResolvedValue(seeded);

    const next = await __testOnly.maybeAutoApplyDefaultSeedsOnRead(['ai_paths_index'], records, {
      autoApply: true,
      applyDefaultSeeds,
    });

    expect(applyDefaultSeeds).toHaveBeenCalledTimes(1);
    expect(next).toEqual(seeded);
  });

  it('treats missing env override as no read-time auto-seeding', () => {
    expect(__testOnly.resolveAutoApplyDefaultSeedsOnRead(undefined)).toBe(false);
  });
});
