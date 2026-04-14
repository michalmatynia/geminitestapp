import { describe, expect, it } from 'vitest';

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
import {
  MARKETPLACE_COPY_DEBRAND_PATH_ID,
  MARKETPLACE_COPY_DEBRAND_TRIGGER_BUTTON_ID,
  MARKETPLACE_COPY_DEBRAND_TRIGGER_LOCATION,
  MARKETPLACE_COPY_DEBRAND_TRIGGER_NAME,
} from '@/shared/lib/ai-paths/marketplace-copy-debrand';
import { loadCanonicalStoredPathConfig } from '@/shared/lib/ai-paths/core/utils/stored-path-config';

const buildEmptyStarterSettings = () => [
  { key: AI_PATHS_INDEX_KEY, value: '[]' },
  { key: AI_PATHS_TRIGGER_BUTTONS_KEY, value: '[]' },
];

const buildStaticRecoveryRecords = () =>
  restoreStaticStarterWorkflowBundle(buildEmptyStarterSettings()).nextRecords;

describe('settings-store flag preservation and maintenance-only starter policy', () => {
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

  it('exposes only flag-preservation helpers from settings-store test hooks', () => {
    expect(Object.keys(__testOnly)).toEqual(['preservePathConfigFlagsOnSeed']);
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

  it('restores the canonical marketplace copy debrand row trigger when it is removed from auto-seeded settings', () => {
    const fullySeeded = ensureStarterWorkflowDefaults(buildEmptyStarterSettings()).nextRecords;
    const withoutDebrandTrigger = fullySeeded.map((record) => {
      if (record.key !== AI_PATHS_TRIGGER_BUTTONS_KEY) return record;
      const parsed = JSON.parse(record.value) as Array<Record<string, unknown>>;
      return {
        ...record,
        value: JSON.stringify(
          parsed.filter(
            (button) => button['id'] !== MARKETPLACE_COPY_DEBRAND_TRIGGER_BUTTON_ID
          )
        ),
      };
    });

    expect(countPendingStarterWorkflowDefaults(withoutDebrandTrigger)).toBeGreaterThan(0);

    const repaired = ensureStarterWorkflowDefaults(withoutDebrandTrigger);
    const triggerButtonsRecord = repaired.nextRecords.find(
      (record) => record.key === AI_PATHS_TRIGGER_BUTTONS_KEY
    );
    if (!triggerButtonsRecord) throw new Error('Expected trigger buttons record');
    const triggerButtons = JSON.parse(triggerButtonsRecord.value) as Array<Record<string, unknown>>;
    const debrandButton = triggerButtons.find(
      (button) => button['id'] === MARKETPLACE_COPY_DEBRAND_TRIGGER_BUTTON_ID
    );

    expect(repaired.affectedCount).toBe(1);
    expect(debrandButton).toEqual(
      expect.objectContaining({
        id: MARKETPLACE_COPY_DEBRAND_TRIGGER_BUTTON_ID,
        name: MARKETPLACE_COPY_DEBRAND_TRIGGER_NAME,
        pathId: MARKETPLACE_COPY_DEBRAND_PATH_ID,
        locations: [MARKETPLACE_COPY_DEBRAND_TRIGGER_LOCATION],
      })
    );
  });

  it('restores the canonical marketplace copy debrand path config with the matching trigger node event', () => {
    const fullySeeded = ensureStarterWorkflowDefaults(buildEmptyStarterSettings()).nextRecords;
    const withoutDebrandPath = fullySeeded.filter(
      (record) => record.key !== `${AI_PATHS_CONFIG_KEY_PREFIX}${MARKETPLACE_COPY_DEBRAND_PATH_ID}`
    );

    expect(countPendingStarterWorkflowDefaults(withoutDebrandPath)).toBeGreaterThan(0);

    const repaired = ensureStarterWorkflowDefaults(withoutDebrandPath);
    const debrandPathRecord = repaired.nextRecords.find(
      (record) => record.key === `${AI_PATHS_CONFIG_KEY_PREFIX}${MARKETPLACE_COPY_DEBRAND_PATH_ID}`
    );
    if (!debrandPathRecord) throw new Error('Expected marketplace copy debrand path config');

    const debrandPathConfig = JSON.parse(debrandPathRecord.value) as {
      nodes?: Array<{
        type?: string;
        config?: {
          trigger?: {
            event?: string;
          };
        };
      }>;
    };
    const triggerNodes = (debrandPathConfig.nodes ?? []).filter((node) => node.type === 'trigger');

    expect(repaired.affectedCount).toBe(1);
    expect(triggerNodes).toHaveLength(1);
    expect(triggerNodes[0]?.config?.trigger?.event).toBe(MARKETPLACE_COPY_DEBRAND_TRIGGER_BUTTON_ID);
  });

  it('refreshes stale marketplace copy debrand configs to add the database persistence node', () => {
    const fullySeeded = ensureStarterWorkflowDefaults(buildEmptyStarterSettings()).nextRecords;
    const staleRecords = fullySeeded.map((record) => {
      if (record.key !== `${AI_PATHS_CONFIG_KEY_PREFIX}${MARKETPLACE_COPY_DEBRAND_PATH_ID}`) {
        return record;
      }

      const parsed = JSON.parse(record.value) as Record<string, unknown>;
      const nodes = Array.isArray(parsed['nodes'])
        ? (parsed['nodes'] as Array<Record<string, unknown>>)
        : [];
      const edges = Array.isArray(parsed['edges'])
        ? (parsed['edges'] as Array<Record<string, unknown>>)
        : [];

      return {
        ...record,
        value: JSON.stringify({
          ...parsed,
          version: 3,
          nodes: nodes.map((node) =>
            node['id'] !== 'node-db-update-marketplace-copy-debrand'
              ? node
              : {
                  ...node,
                  config: {
                    ...(node['config'] && typeof node['config'] === 'object'
                      ? (node['config'] as Record<string, unknown>)
                      : {}),
                    database: {
                      ...(((node['config'] as Record<string, unknown> | undefined)?.['database'] &&
                      typeof (node['config'] as Record<string, unknown>)['database'] === 'object')
                        ? ((node['config'] as Record<string, unknown>)['database'] as Record<
                            string,
                            unknown
                          >)
                        : {}),
                      updateTemplate:
                        '{\n  "$set": {\n    "marketplaceContentOverrides.{{context.marketplaceCopyDebrandInput.targetRow.index}}.title": "{{value.debrandedTitle}}",\n    "marketplaceContentOverrides.{{context.marketplaceCopyDebrandInput.targetRow.index}}.description": "{{value.debrandedDescription}}"\n  },\n  "$unset": {\n    "__noop__": ""\n  }\n}',
                      query: {
                        provider: 'auto',
                        collection: 'products',
                        mode: 'custom',
                        preset: 'by_id',
                        field: 'id',
                        idType: 'string',
                        queryTemplate: '{"id":"{{entityId}}"}',
                        limit: 1,
                        sort: '',
                        projection: '',
                        single: true,
                      },
                    },
                  },
                }
          ),
          edges,
          extensions: {
            ...(parsed['extensions'] && typeof parsed['extensions'] === 'object'
              ? (parsed['extensions'] as Record<string, unknown>)
              : {}),
            aiPathsStarter: {
              starterKey: 'marketplace_copy_debrand',
              templateId: 'starter_marketplace_copy_debrand',
              templateVersion: 3,
              seededDefault: true,
            },
          },
        }),
      };
    });

    const refreshed = refreshStarterWorkflowConfigs(staleRecords);
    expect(refreshed.affectedCount).toBeGreaterThan(0);

    const debrandRecord = refreshed.nextRecords.find(
      (record) => record.key === `${AI_PATHS_CONFIG_KEY_PREFIX}${MARKETPLACE_COPY_DEBRAND_PATH_ID}`
    );
    if (!debrandRecord) throw new Error('Expected marketplace copy debrand path config');

    const canonical = loadCanonicalStoredPathConfig({
      pathId: MARKETPLACE_COPY_DEBRAND_PATH_ID,
      rawConfig: debrandRecord.value,
    });
    const parsed = JSON.parse(debrandRecord.value) as Record<string, unknown>;
    const databaseNode = canonical.nodes.find((node) => node.type === 'database');
    const databaseConfig =
      databaseNode?.config &&
      typeof databaseNode.config === 'object' &&
      (databaseNode.config as Record<string, unknown>)['database'] &&
      typeof (databaseNode.config as Record<string, unknown>)['database'] === 'object'
        ? ((databaseNode.config as Record<string, unknown>)['database'] as Record<string, unknown>)
        : null;
    const starterExtension =
      parsed['extensions'] &&
      typeof parsed['extensions'] === 'object' &&
      (parsed['extensions'] as Record<string, unknown>)['aiPathsStarter'] &&
      typeof (parsed['extensions'] as Record<string, unknown>)['aiPathsStarter'] === 'object'
        ? ((parsed['extensions'] as Record<string, unknown>)['aiPathsStarter'] as Record<string, unknown>)
        : null;

    expect(databaseNode?.type).toBe('database');
    expect(databaseConfig?.['updatePayloadMode']).toBe('custom');
    expect(typeof databaseConfig?.['updateTemplate']).toBe('string');
    expect(databaseConfig?.['updateTemplate']).toContain(
      'marketplaceContentOverrides.$.title'
    );
    expect(
      ((databaseConfig?.['writeOutcomePolicy'] as Record<string, unknown> | undefined)?.[
        'onZeroAffected'
      ] as string | undefined) ?? ''
    ).toBe('fail');
    expect(
      ((databaseConfig?.['query'] as Record<string, unknown> | undefined)?.['queryTemplate'] as
        | string
        | undefined) ?? ''
    ).toContain('"$elemMatch"');
    expect(starterExtension?.['templateVersion']).not.toBe(3);
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

  it('restores the canonical marketplace copy debrand row trigger when it is removed from the static recovery bundle', () => {
    const restored = buildStaticRecoveryRecords();
    const withoutDebrandTrigger = restored.map((record) => {
      if (record.key !== AI_PATHS_TRIGGER_BUTTONS_KEY) return record;
      const parsed = JSON.parse(record.value) as Array<Record<string, unknown>>;
      return {
        ...record,
        value: JSON.stringify(
          parsed.filter(
            (button) => button['id'] !== MARKETPLACE_COPY_DEBRAND_TRIGGER_BUTTON_ID
          )
        ),
      };
    });

    expect(countPendingStaticStarterWorkflowBundle(withoutDebrandTrigger)).toBeGreaterThan(0);

    const repaired = restoreStaticStarterWorkflowBundle(withoutDebrandTrigger);
    const triggerButtonsRecord = repaired.nextRecords.find(
      (record) => record.key === AI_PATHS_TRIGGER_BUTTONS_KEY
    );
    if (!triggerButtonsRecord) throw new Error('Expected trigger buttons record');
    const triggerButtons = JSON.parse(triggerButtonsRecord.value) as Array<Record<string, unknown>>;
    const debrandButton = triggerButtons.find(
      (button) => button['id'] === MARKETPLACE_COPY_DEBRAND_TRIGGER_BUTTON_ID
    );

    expect(repaired.affectedCount).toBe(1);
    expect(debrandButton).toEqual(
      expect.objectContaining({
        id: MARKETPLACE_COPY_DEBRAND_TRIGGER_BUTTON_ID,
        name: MARKETPLACE_COPY_DEBRAND_TRIGGER_NAME,
        pathId: MARKETPLACE_COPY_DEBRAND_PATH_ID,
        locations: [MARKETPLACE_COPY_DEBRAND_TRIGGER_LOCATION],
      })
    );
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

  it('does not upgrade a legacy unbound normalize button during default seeding', () => {
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
    const canonicalNormalizeButton = triggerButtons.find(
      (button) => button['id'] === '7d58d6a0-44c7-4d69-a2e4-8d8d1f3f5a27'
    );
    const legacyButton = triggerButtons.find(
      (button) => button['id'] === 'cf9974ae-1fb3-4e61-8a30-8df8af63744f'
    );

    expect(canonicalNormalizeButton).toEqual(
      expect.objectContaining({
        id: '7d58d6a0-44c7-4d69-a2e4-8d8d1f3f5a27',
        pathId: 'path_name_normalize_v1',
        locations: ['product_modal'],
      })
    );
    expect(legacyButton).toEqual(
      expect.objectContaining({
        id: 'cf9974ae-1fb3-4e61-8a30-8df8af63744f',
        pathId: null,
        name: 'Normalize',
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
    const normalizeModelNode = nodes.find((node) => {
      if (node['type'] !== 'model') return false;
      const config =
        node['config'] && typeof node['config'] === 'object'
          ? (node['config'] as Record<string, unknown>)
          : null;
      const modelConfig =
        config?.['model'] && typeof config['model'] === 'object'
          ? (config['model'] as Record<string, unknown>)
          : null;
      return modelConfig?.['systemPrompt'] === 'Only return normalized output.';
    });
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
    expect(
      loadCanonicalStoredPathConfig({
        pathId: 'path_name_normalize_v1',
        rawConfig: normalizeRecord.value,
      }).id
    ).toBe('path_name_normalize_v1');
  });
});
