import { describe, expect, it, vi } from 'vitest';

import { __testOnly } from '@/features/ai/ai-paths/server/settings-store';
import {
  countPendingStaticStarterWorkflowBundle,
  countPendingStarterWorkflowDefaults,
  ensureStarterWorkflowDefaults,
  refreshStarterWorkflowConfigs,
  restoreStaticStarterWorkflowBundle,
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

const buildEmptyStarterSettings = () => [
  { key: AI_PATHS_INDEX_KEY, value: '[]' },
  { key: AI_PATHS_TRIGGER_BUTTONS_KEY, value: '[]' },
];

const buildStaticRecoveryRecords = () =>
  restoreStaticStarterWorkflowBundle(buildEmptyStarterSettings()).nextRecords;

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
    const initial = buildEmptyStarterSettings();

    expect(countPendingStarterWorkflowDefaults(initial)).toBeGreaterThan(0);

    const seeded = ensureStarterWorkflowDefaults(initial);

    expect(seeded.affectedCount).toBeGreaterThan(0);
    expect(
      seeded.nextRecords.some((record) => record.key === `${AI_PATHS_CONFIG_KEY_PREFIX}path_syr8f4`)
    ).toBe(true);
    expect(
      seeded.nextRecords.some(
        (record) => record.key === `${AI_PATHS_CONFIG_KEY_PREFIX}path_descv3lite`
      )
    ).toBe(true);
    expect(
      seeded.nextRecords.some(
        (record) => record.key === `${AI_PATHS_CONFIG_KEY_PREFIX}path_base_export_blwo_v1`
      )
    ).toBe(true);
    expect(
      seeded.nextRecords.some(
        (record) => record.key === `${AI_PATHS_CONFIG_KEY_PREFIX}path_name_normalize_v1`
      )
    ).toBe(true);
    expect(
      seeded.nextRecords.some(
        (record) => record.key === `${AI_PATHS_CONFIG_KEY_PREFIX}path_marketplace_copy_debrand_v1`
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
      triggerButtons.some((button) => button['id'] === '4c07d35b-ea92-4d1f-b86b-c586359f68de')
    ).toBe(true);
    expect(
      triggerButtons.some((button) => button['id'] === '5f36f340-3d89-4f6f-a08f-2387f380b90b')
    ).toBe(true);
    expect(
      triggerButtons.some((button) => button['id'] === '7d58d6a0-44c7-4d69-a2e4-8d8d1f3f5a27')
    ).toBe(true);
    expect(
      triggerButtons.some((button) => button['id'] === 'bdf0f5d2-a300-4f79-991c-2b5f1e0ef3a4')
    ).toBe(true);
  });

  it('restores the broader static recovery bundle from semantic workflow assets', () => {
    const initial = [
      { key: AI_PATHS_INDEX_KEY, value: '[]' },
      { key: AI_PATHS_TRIGGER_BUTTONS_KEY, value: '[]' },
    ];

    expect(countPendingStaticStarterWorkflowBundle(initial)).toBeGreaterThan(
      countPendingStarterWorkflowDefaults(initial)
    );

    const restored = restoreStaticStarterWorkflowBundle(initial);

    expect(restored.affectedCount).toBeGreaterThan(0);
    expect(
      restored.nextRecords.some(
        (record) => record.key === `${AI_PATHS_CONFIG_KEY_PREFIX}path_descv3lite`
      )
    ).toBe(true);
    expect(
      restored.nextRecords.some(
        (record) => record.key === `${AI_PATHS_CONFIG_KEY_PREFIX}path_name_normalize_v1`
      )
    ).toBe(true);
    expect(
      restored.nextRecords.some(
        (record) => record.key === `${AI_PATHS_CONFIG_KEY_PREFIX}path_marketplace_copy_debrand_v1`
      )
    ).toBe(true);
    expect(
      restored.nextRecords.some((record) => record.key === `${AI_PATHS_CONFIG_KEY_PREFIX}path_96708d`)
    ).toBe(true);

    const triggerButtonsRecord = restored.nextRecords.find(
      (record) => record.key === AI_PATHS_TRIGGER_BUTTONS_KEY
    );
    if (!triggerButtonsRecord) throw new Error('Expected trigger buttons record');
    const triggerButtons = JSON.parse(triggerButtonsRecord.value) as Array<Record<string, unknown>>;
    expect(
      triggerButtons.some((button) => button['id'] === '4c07d35b-ea92-4d1f-b86b-c586359f68de')
    ).toBe(true);
    expect(
      triggerButtons.some((button) => button['id'] === '7d58d6a0-44c7-4d69-a2e4-8d8d1f3f5a27')
    ).toBe(true);
    expect(
      triggerButtons.some((button) => button['id'] === 'bdf0f5d2-a300-4f79-991c-2b5f1e0ef3a4')
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

  it('refreshes stale starter trigger button fields while preserving user state', () => {
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
    const staleRecords = fullySeeded.map((record) => {
      if (record.key !== AI_PATHS_TRIGGER_BUTTONS_KEY) return record;
      const parsed = JSON.parse(record.value) as Array<Record<string, unknown>>;
      return {
        ...record,
        value: JSON.stringify(
          parsed.map((button) =>
            button['id'] === 'bdf0f5d2-a300-4f79-991c-2b5f1e0ef3a4'
              ? {
                  ...button,
                  name: 'Debrand Copy',
                  enabled: false,
                  display: 'icon_label',
                  sortIndex: 99,
                  updatedAt: '2026-04-01T00:00:00.000Z',
                }
              : button
          )
        ),
      };
    });

    const refreshed = ensureStarterWorkflowDefaults(staleRecords);
    const triggerButtonsRecord = refreshed.nextRecords.find(
      (record) => record.key === AI_PATHS_TRIGGER_BUTTONS_KEY
    );
    if (!triggerButtonsRecord) throw new Error('Expected trigger buttons record');
    const triggerButtons = JSON.parse(triggerButtonsRecord.value) as Array<Record<string, unknown>>;
    const debrandButton = triggerButtons.find(
      (button) => button['id'] === 'bdf0f5d2-a300-4f79-991c-2b5f1e0ef3a4'
    );

    expect(refreshed.affectedCount).toBe(1);
    expect(debrandButton).toEqual(
      expect.objectContaining({
        name: 'Debrand',
        pathId: 'path_marketplace_copy_debrand_v1',
        locations: ['product_marketplace_copy_row'],
        mode: 'click',
        display: 'icon_label',
        enabled: false,
        sortIndex: 99,
      })
    );
    expect(debrandButton?.['updatedAt']).not.toBe('2026-04-01T00:00:00.000Z');
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

  it('upgrades a legacy unbound normalize button during default seeding', () => {
    const legacyNormalizeButton = {
      id: 'cf9974ae-1fb3-4e61-8a30-8df8af63744f',
      name: 'Normalize',
      iconId: null,
      pathId: null,
      enabled: true,
      locations: ['product_modal'],
      mode: 'execute_path',
      display: 'icon_label',
      createdAt: '2026-04-08T23:00:00.000Z',
      updatedAt: '2026-04-08T23:00:00.000Z',
      sortIndex: 3,
    };

    const upgraded = ensureStarterWorkflowDefaults([
      {
        key: AI_PATHS_INDEX_KEY,
        value: '[]',
      },
      {
        key: AI_PATHS_TRIGGER_BUTTONS_KEY,
        value: JSON.stringify([legacyNormalizeButton]),
      },
    ]);

    const triggerButtonsRecord = upgraded.nextRecords.find(
      (record) => record.key === AI_PATHS_TRIGGER_BUTTONS_KEY
    );
    if (!triggerButtonsRecord) throw new Error('Expected trigger buttons record');

    const triggerButtons = JSON.parse(triggerButtonsRecord.value) as Array<Record<string, unknown>>;
    const normalizeButtons = triggerButtons.filter((button) => button['name'] === 'Normalize');

    expect(normalizeButtons).toHaveLength(1);
    expect(normalizeButtons[0]).toEqual(
      expect.objectContaining({
        id: '7d58d6a0-44c7-4d69-a2e4-8d8d1f3f5a27',
        pathId: 'path_name_normalize_v1',
        locations: ['product_modal'],
      })
    );
  });

  it('does not inherit normalize starter model selection from other starter paths', () => {
    const seeded = buildStaticRecoveryRecords();

    const descriptionButton = {
      id: 'f5af953f-632d-4704-adec-cc7e58aa68c6',
      name: 'Description',
      iconId: null,
      pathId: null,
      enabled: true,
      locations: ['product_modal'],
      mode: 'execute_path',
      display: 'icon_label',
      createdAt: '2026-04-09T08:00:00.000Z',
      updatedAt: '2026-04-09T08:00:00.000Z',
      sortIndex: 2,
    };

    const records = seeded.map((record) => {
      if (record.key === `${AI_PATHS_CONFIG_KEY_PREFIX}path_name_normalize_v1`) {
        const parsed = JSON.parse(record.value) as Record<string, unknown>;
        const nodes = Array.isArray(parsed['nodes']) ? (parsed['nodes'] as Array<Record<string, unknown>>) : [];
        const nextNodes = nodes.map((node) => {
          if (node['type'] !== 'model') return node;
          const config =
            node['config'] && typeof node['config'] === 'object'
              ? { ...(node['config'] as Record<string, unknown>) }
              : {};
          const model =
            config['model'] && typeof config['model'] === 'object'
              ? { ...(config['model'] as Record<string, unknown>) }
              : {};
          delete model['modelId'];
          return {
            ...node,
            config: {
              ...config,
              model,
            },
          };
        });
        return {
          ...record,
          value: JSON.stringify({
            ...parsed,
            nodes: nextNodes,
          }),
        };
      }
      if (record.key === AI_PATHS_TRIGGER_BUTTONS_KEY) {
        return {
          ...record,
          value: JSON.stringify([descriptionButton]),
        };
      }
      return record;
    });

    records.push({
      key: `${AI_PATHS_CONFIG_KEY_PREFIX}path_72l57d`,
      value: JSON.stringify({
        id: 'path_72l57d',
        version: 1,
        trigger: 'manual',
        name: 'Description v4 Hybrid human AI',
        description: 'Mock description path',
        createdAt: '2026-04-09T08:00:00.000Z',
        updatedAt: '2026-04-09T08:00:00.000Z',
        isActive: true,
        nodes: [
          {
            id: 'node-description-trigger',
            type: 'trigger',
            title: 'Trigger: Description',
            position: { x: 0, y: 0 },
            inputs: [],
            outputs: ['trigger'],
            config: {
              trigger: {
                event: descriptionButton.id,
                contextMode: 'trigger_only',
              },
            },
            connections: {
              incoming: [],
              outgoing: [],
            },
          },
          {
            id: 'node-description-model',
            type: 'model',
            title: 'Model',
            position: { x: 200, y: 0 },
            inputs: ['input'],
            outputs: ['result'],
            config: {
              model: {
                modelId: 'gpt-oss:120b-cloud',
                temperature: 1,
                maxTokens: 800,
                vision: true,
                waitForResult: true,
              },
            },
            connections: {
              incoming: [],
              outgoing: [],
            },
          },
        ],
        edges: [],
      }),
    });

    const refreshed = ensureStarterWorkflowDefaults(records);
    const normalizeRecord = refreshed.nextRecords.find(
      (record) => record.key === `${AI_PATHS_CONFIG_KEY_PREFIX}path_name_normalize_v1`
    );
    if (!normalizeRecord) throw new Error('Expected normalize config record');

    const parsed = JSON.parse(normalizeRecord.value) as Record<string, unknown>;
    const nodes = Array.isArray(parsed['nodes']) ? (parsed['nodes'] as Array<Record<string, unknown>>) : [];
    const normalizeModelNode = nodes.find((node) => node['type'] === 'model');
    const modelConfig =
      normalizeModelNode?.['config'] &&
      typeof normalizeModelNode['config'] === 'object' &&
      (normalizeModelNode['config'] as Record<string, unknown>)['model'] &&
      typeof (normalizeModelNode['config'] as Record<string, unknown>)['model'] === 'object'
        ? ((normalizeModelNode['config'] as Record<string, unknown>)['model'] as Record<string, unknown>)
        : null;

    expect(modelConfig?.['modelId']).toBeUndefined();
  });

  it('does not rewrite a legacy normalize node override during static recovery restore', () => {
    const seeded = buildStaticRecoveryRecords();

    const staleRecords = seeded
      .filter((record) => record.key === `${AI_PATHS_CONFIG_KEY_PREFIX}path_name_normalize_v1`)
      .map((record) => {
        if (record.key !== `${AI_PATHS_CONFIG_KEY_PREFIX}path_name_normalize_v1`) {
          return record;
        }

      const parsed = JSON.parse(record.value) as Record<string, unknown>;
      const nodes = Array.isArray(parsed['nodes']) ? (parsed['nodes'] as Array<Record<string, unknown>>) : [];
      const nextNodes = nodes.map((node) => {
        if (node['id'] !== 'node-model-name-normalize') return node;
        const config =
          node['config'] && typeof node['config'] === 'object'
            ? { ...(node['config'] as Record<string, unknown>) }
            : {};
        const model =
          config['model'] && typeof config['model'] === 'object'
            ? { ...(config['model'] as Record<string, unknown>) }
            : {};
        model['modelId'] = 'ollama:gemma3';
        return {
          ...node,
          config: {
            ...config,
            model,
          },
        };
      });

      return {
        ...record,
        value: JSON.stringify({
          ...parsed,
          nodes: nextNodes,
          extensions: {
            ...(parsed['extensions'] && typeof parsed['extensions'] === 'object'
              ? (parsed['extensions'] as Record<string, unknown>)
              : {}),
            aiPathsStarter: {
              starterKey: 'product_name_normalize',
              templateId: 'starter_product_name_normalize',
              templateVersion: 2,
              seededDefault: false,
            },
          },
        }),
      };
      });

    const refreshed = restoreStaticStarterWorkflowBundle(staleRecords);
    const normalizeRecord = refreshed.nextRecords.find(
      (record) => record.key === `${AI_PATHS_CONFIG_KEY_PREFIX}path_name_normalize_v1`
    );
    if (!normalizeRecord) throw new Error('Expected normalize config record');

    const parsed = JSON.parse(normalizeRecord.value) as Record<string, unknown>;
    const nodes = Array.isArray(parsed['nodes']) ? (parsed['nodes'] as Array<Record<string, unknown>>) : [];
    const normalizeModelNode = nodes.find((node) => node['id'] === 'node-model-name-normalize');
    const modelConfig =
      normalizeModelNode?.['config'] &&
      typeof normalizeModelNode['config'] === 'object' &&
      (normalizeModelNode['config'] as Record<string, unknown>)['model'] &&
      typeof (normalizeModelNode['config'] as Record<string, unknown>)['model'] === 'object'
        ? ((normalizeModelNode['config'] as Record<string, unknown>)['model'] as Record<string, unknown>)
        : null;

    expect(modelConfig?.['modelId']).toBe('ollama:gemma3');
  });

  it('refreshes stale Normalize starter configs while preserving edited model settings', () => {
    const seeded = buildStaticRecoveryRecords();

    const staleRecords = seeded
      .filter((record) => record.key === `${AI_PATHS_CONFIG_KEY_PREFIX}path_name_normalize_v1`)
      .map((record) => {
      if (record.key !== `${AI_PATHS_CONFIG_KEY_PREFIX}path_name_normalize_v1`) {
        return record;
      }

      const parsed = JSON.parse(record.value) as Record<string, unknown>;
      const nodes = Array.isArray(parsed['nodes'])
        ? (parsed['nodes'] as Array<Record<string, unknown>>)
        : [];
      const nextNodes = nodes.map((node) => {
        if (node['id'] !== 'node-model-name-normalize') return node;
        const config =
          node['config'] && typeof node['config'] === 'object'
            ? { ...(node['config'] as Record<string, unknown>) }
            : {};
        const model =
          config['model'] && typeof config['model'] === 'object'
            ? { ...(config['model'] as Record<string, unknown>) }
            : {};
        model['temperature'] = 0.35;
        model['maxTokens'] = 1337;
        model['systemPrompt'] = 'Only return normalized output.';
        model['waitForResult'] = false;
        return {
          ...node,
          config: {
            ...config,
            model,
          },
        };
      });

      return {
        ...record,
        value: JSON.stringify({
          ...parsed,
          nodes: nextNodes,
          extensions: {
            ...(parsed['extensions'] && typeof parsed['extensions'] === 'object'
              ? (parsed['extensions'] as Record<string, unknown>)
              : {}),
            aiPathsStarter: {
              starterKey: 'product_name_normalize',
              templateId: 'starter_product_name_normalize',
              templateVersion: 2,
              seededDefault: false,
            },
          },
        }),
      };
      });

    const refreshed = refreshStarterWorkflowConfigs(staleRecords);
    expect(refreshed.affectedCount).toBe(1);

    const normalizeRecord = refreshed.nextRecords.find(
      (record) => record.key === `${AI_PATHS_CONFIG_KEY_PREFIX}path_name_normalize_v1`
    );
    if (!normalizeRecord) throw new Error('Expected normalize config record');

    const parsed = JSON.parse(normalizeRecord.value) as Record<string, unknown>;
    const nodes = Array.isArray(parsed['nodes'])
      ? (parsed['nodes'] as Array<Record<string, unknown>>)
      : [];
    const normalizeModelNode = nodes.find((node) => node['id'] === 'node-model-name-normalize');
    const modelConfig =
      normalizeModelNode?.['config'] &&
      typeof normalizeModelNode['config'] === 'object' &&
      (normalizeModelNode['config'] as Record<string, unknown>)['model'] &&
      typeof (normalizeModelNode['config'] as Record<string, unknown>)['model'] === 'object'
        ? ((normalizeModelNode['config'] as Record<string, unknown>)['model'] as Record<string, unknown>)
        : null;
    const starterExtension =
      parsed['extensions'] &&
      typeof parsed['extensions'] === 'object' &&
      (parsed['extensions'] as Record<string, unknown>)['aiPathsStarter'] &&
      typeof (parsed['extensions'] as Record<string, unknown>)['aiPathsStarter'] === 'object'
        ? ((parsed['extensions'] as Record<string, unknown>)['aiPathsStarter'] as Record<string, unknown>)
        : null;

    expect(modelConfig).toEqual(
      expect.objectContaining({
        temperature: 0.35,
        maxTokens: 1337,
        systemPrompt: 'Only return normalized output.',
        waitForResult: false,
      })
    );
    expect(starterExtension?.['templateVersion']).not.toBe(2);
  });
});
