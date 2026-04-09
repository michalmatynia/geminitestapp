import { describe, expect, it, vi } from 'vitest';

import { __testOnly } from '@/features/ai/ai-paths/server/settings-store';
import {
  countPendingStarterWorkflowDefaults,
  ensureStarterWorkflowDefaults,
} from '@/features/ai/ai-paths/server/starter-workflows-settings';
import {
  AI_PATHS_CONFIG_KEY_PREFIX,
  AI_PATHS_INDEX_KEY,
  AI_PATHS_TRIGGER_BUTTONS_KEY,
} from '@/features/ai/ai-paths/server/settings-store.constants';
import {
  getStarterWorkflowTemplateById,
  materializeStarterWorkflowPathConfig,
} from '@/shared/lib/ai-paths/core/starter-workflows';

describe('settings-store flag preservation and read-time seeding policy', () => {
  it('preserves path activation and lock flags when seeded defaults are rewritten', () => {
    const existingFlags = JSON.stringify({
      id: 'path_custom',
      isActive: false,
      isLocked: true,
    });
    const seededConfigs = [
      {
        templateId: 'starter_parameter_inference',
        pathId: 'path_syr8f4',
      },
      {
        templateId: 'starter_description_inference_lite',
        pathId: 'path_descv3lite',
      },
      {
        templateId: 'starter_base_export_blwo',
        pathId: 'path_base_export_blwo_v1',
      },
    ].map((entry) => {
      const template = getStarterWorkflowTemplateById(entry.templateId);
      if (!template) throw new Error(`Missing template ${entry.templateId}`);
      return {
        pathId: entry.pathId,
        raw: JSON.stringify(
          materializeStarterWorkflowPathConfig(template, {
            pathId: entry.pathId,
            seededDefault: true,
          })
        ),
      };
    });

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

  it('generically seeds auto-seeded starter workflows from the registry', () => {
    const initial = [
      { key: AI_PATHS_INDEX_KEY, value: '[]' },
      { key: AI_PATHS_TRIGGER_BUTTONS_KEY, value: '[]' },
    ];

    expect(countPendingStarterWorkflowDefaults(initial)).toBeGreaterThan(0);

    const seeded = ensureStarterWorkflowDefaults(initial);

    expect(seeded.affectedCount).toBeGreaterThan(0);
    expect(
      seeded.nextRecords.some((record) => record.key === `${AI_PATHS_CONFIG_KEY_PREFIX}path_syr8f4`)
    ).toBe(true);
    expect(
      seeded.nextRecords.some(
        (record) => record.key === `${AI_PATHS_CONFIG_KEY_PREFIX}path_name_normalize_v1`
      )
    ).toBe(true);
    expect(
      seeded.nextRecords.some(
        (record) => record.key === `${AI_PATHS_CONFIG_KEY_PREFIX}path_base_export_blwo_v1`
      )
    ).toBe(true);

    const triggerButtonsRecord = seeded.nextRecords.find(
      (record) => record.key === AI_PATHS_TRIGGER_BUTTONS_KEY
    );
    if (!triggerButtonsRecord) throw new Error('Expected trigger buttons record');
    const triggerButtons = JSON.parse(triggerButtonsRecord.value) as Array<Record<string, unknown>>;
    expect(
      triggerButtons.some((button) => button['id'] === '0ef40981-7ac6-416e-9205-7200289f851c')
    ).toBe(true);
    expect(
      triggerButtons.some((button) => button['id'] === '7d58d6a0-44c7-4d69-a2e4-8d8d1f3f5a27')
    ).toBe(true);
    expect(
      triggerButtons.some((button) => button['id'] === '5f36f340-3d89-4f6f-a08f-2387f380b90b')
    ).toBe(true);
  });

  it('rejects invalid trigger button payloads during starter seeding', () => {
    expect(() =>
      ensureStarterWorkflowDefaults([
        { key: AI_PATHS_INDEX_KEY, value: '[]' },
        { key: AI_PATHS_TRIGGER_BUTTONS_KEY, value: '{"invalid":"shape"}' },
      ])
    ).toThrowError('Invalid AI trigger button settings payload.');
  });

  it('does not rewrite existing starter configs without explicit upgrade actions', () => {
    const template = getStarterWorkflowTemplateById('starter_parameter_inference');
    if (!template) throw new Error('Missing starter_parameter_inference template');

    const stale = materializeStarterWorkflowPathConfig(template, {
      pathId: 'path_syr8f4',
      seededDefault: true,
    });
    const staleWithoutProvenance = {
      ...stale,
      extensions: {},
    };
    const fullySeeded = ensureStarterWorkflowDefaults([
      {
        key: AI_PATHS_INDEX_KEY,
        value: '[]',
      },
      {
        key: AI_PATHS_TRIGGER_BUTTONS_KEY,
        value: '[]',
      },
    ]).nextRecords;
    const initial = fullySeeded.map((record) =>
      record.key === `${AI_PATHS_CONFIG_KEY_PREFIX}path_syr8f4`
        ? { ...record, value: JSON.stringify(staleWithoutProvenance) }
        : record
    );

    expect(countPendingStarterWorkflowDefaults(initial)).toBe(0);

    const refreshed = ensureStarterWorkflowDefaults(initial);
    expect(refreshed.affectedCount).toBe(0);

    const configRecord = refreshed.nextRecords.find(
      (record) => record.key === `${AI_PATHS_CONFIG_KEY_PREFIX}path_syr8f4`
    );
    if (!configRecord) throw new Error('Expected path_syr8f4 config record');
    const parsed = JSON.parse(configRecord.value) as Record<string, unknown>;
    const starterExtension =
      (parsed['extensions'] as Record<string, unknown>)?.['aiPathsStarter'] ?? null;
    expect(starterExtension).toBeNull();
  });

  it('does not count or reseed starter trigger buttons for inactive starter paths', () => {
    const fullySeeded = ensureStarterWorkflowDefaults([
      {
        key: AI_PATHS_INDEX_KEY,
        value: '[]',
      },
      {
        key: AI_PATHS_TRIGGER_BUTTONS_KEY,
        value: '[]',
      },
    ]).nextRecords;

    const inactive = fullySeeded.map((record) => {
      if (record.key === `${AI_PATHS_CONFIG_KEY_PREFIX}path_syr8f4`) {
        const parsed = JSON.parse(record.value) as Record<string, unknown>;
        return {
          ...record,
          value: JSON.stringify({
            ...parsed,
            isActive: false,
          }),
        };
      }
      if (record.key === AI_PATHS_TRIGGER_BUTTONS_KEY) {
        const parsed = JSON.parse(record.value) as Array<Record<string, unknown>>;
        return {
          ...record,
          value: JSON.stringify(
            parsed.filter((button) => button['id'] !== '0ef40981-7ac6-416e-9205-7200289f851c')
          ),
        };
      }
      return record;
    });

    expect(countPendingStarterWorkflowDefaults(inactive)).toBe(0);

    const refreshed = ensureStarterWorkflowDefaults(inactive);
    expect(refreshed.affectedCount).toBe(0);

    const triggerButtonsRecord = refreshed.nextRecords.find(
      (record) => record.key === AI_PATHS_TRIGGER_BUTTONS_KEY
    );
    if (!triggerButtonsRecord) throw new Error('Expected trigger buttons record');
    const triggerButtons = JSON.parse(triggerButtonsRecord.value) as Array<Record<string, unknown>>;
    expect(
      triggerButtons.some((button) => button['id'] === '0ef40981-7ac6-416e-9205-7200289f851c')
    ).toBe(false);
  });

  it('does not reseed starter trigger buttons when an equivalent button already targets the same path and location', () => {
    const fullySeeded = ensureStarterWorkflowDefaults([
      {
        key: AI_PATHS_INDEX_KEY,
        value: '[]',
      },
      {
        key: AI_PATHS_TRIGGER_BUTTONS_KEY,
        value: '[]',
      },
    ]).nextRecords;

    const withCustomReplacement = fullySeeded.map((record) => {
      if (record.key !== AI_PATHS_TRIGGER_BUTTONS_KEY) return record;
      const parsed = JSON.parse(record.value) as Array<Record<string, unknown>>;
      return {
        ...record,
        value: JSON.stringify([
          ...parsed.filter((button) => button['id'] !== '0ef40981-7ac6-416e-9205-7200289f851c'),
          {
            id: 'btn-custom-param',
            name: 'Infer Params',
            iconId: null,
            pathId: 'path_syr8f4',
            enabled: true,
            locations: ['product_modal'],
            mode: 'click',
            display: 'icon_label',
            createdAt: '2026-03-06T00:00:00.000Z',
            updatedAt: '2026-03-06T00:00:00.000Z',
            sortIndex: 25,
          },
        ]),
      };
    });

    expect(countPendingStarterWorkflowDefaults(withCustomReplacement)).toBe(0);

    const refreshed = ensureStarterWorkflowDefaults(withCustomReplacement);
    expect(refreshed.affectedCount).toBe(0);

    const triggerButtonsRecord = refreshed.nextRecords.find(
      (record) => record.key === AI_PATHS_TRIGGER_BUTTONS_KEY
    );
    if (!triggerButtonsRecord) throw new Error('Expected trigger buttons record');
    const triggerButtons = JSON.parse(triggerButtonsRecord.value) as Array<Record<string, unknown>>;
    expect(
      triggerButtons.some((button) => button['id'] === '0ef40981-7ac6-416e-9205-7200289f851c')
    ).toBe(false);
    expect(triggerButtons.some((button) => button['id'] === 'btn-custom-param')).toBe(true);
  });
});
