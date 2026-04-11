import { describe, expect, it } from 'vitest';

import {
  buildAiPathsMaintenanceReport,
  resolveRequestedMaintenanceActionIds,
  runMaintenanceAction,
} from '@/features/ai/ai-paths/server/settings-store.maintenance';
import type {
  AiPathsMaintenanceActionId,
  AiPathsSettingRecord,
} from '@/features/ai/ai-paths/server/settings-store.constants';
import {
  AI_PATHS_CONFIG_KEY_PREFIX,
  AI_PATHS_INDEX_KEY,
  AI_PATHS_TRIGGER_BUTTONS_KEY,
} from '@/features/ai/ai-paths/server/settings-store.constants';
import type { PathConfig } from '@/shared/contracts/ai-paths';
import { evaluateRunPreflight } from '@/shared/lib/ai-paths/core/utils/run-preflight';

const buildLegacyRuntimeContractsConfig = (): Record<string, unknown> => ({
  id: 'path_model_legacy',
  nodes: [
    {
      id: 'prompt-1',
      type: 'prompt',
      inputs: ['bundle'],
      outputs: ['prompt', 'images'],
    },
    {
      id: 'model-1',
      type: 'model',
      inputs: ['prompt', 'images'],
      outputs: ['result', 'jobId'],
      inputContracts: {
        prompt: { required: true },
        images: { required: true },
      },
      config: {
        runtime: {
          waitForInputs: true,
          inputContracts: {
            prompt: { required: true },
            images: { required: true },
          },
        },
      },
    },
  ],
  edges: [
    {
      id: 'edge-prompt',
      from: 'prompt-1',
      to: 'model-1',
      fromPort: 'prompt',
      toPort: 'prompt',
    },
    {
      id: 'edge-images',
      from: 'prompt-1',
      to: 'model-1',
      fromPort: 'images',
      toPort: 'images',
    },
  ],
});

const buildSettingsRecords = (): AiPathsSettingRecord[] => [
  {
    key: AI_PATHS_INDEX_KEY,
    value: JSON.stringify([
      {
        id: 'path_model_legacy',
        name: 'Legacy Model Path',
        createdAt: '2026-03-03T10:00:00.000Z',
        updatedAt: '2026-03-03T10:00:00.000Z',
      },
    ]),
  },
  {
    key: `${AI_PATHS_CONFIG_KEY_PREFIX}path_model_legacy`,
    value: JSON.stringify(buildLegacyRuntimeContractsConfig()),
  },
];

const buildOutdatedTranslationStarterConfig = (): PathConfig =>
  ({
    id: 'path_translation_v2',
    version: 2,
    name: 'Translation EN->PL Description + Parameters v2',
    description: 'Translate English description and parameters to Polish and update the product.',
    trigger: 'Product Modal - Translate EN->PL',
    updatedAt: '2026-03-03T10:00:00.000Z',
    nodes: [
      {
        id: 'node-parser-translate-en-pl',
        type: 'parser',
        title: 'JSON Parser',
        description: '',
        position: { x: 80, y: 180 },
        data: {},
        inputs: ['entityJson', 'context'],
        outputs: ['bundle', 'description_en', 'parameters', 'entityId'],
        config: {
          parser: {
            mappings: {
              description_en: '$.description_en',
              parameters: '$.parameters',
              entityId: '$.id',
            },
            outputMode: 'bundle',
          },
        },
      },
      {
        id: 'node-regex-translate-en-pl',
        type: 'regex',
        title: 'Regex Description JSON',
        description: '',
        position: { x: 380, y: 120 },
        data: {},
        inputs: ['value', 'prompt', 'regexCallback'],
        outputs: ['grouped', 'matches', 'value', 'aiPrompt'],
        config: {
          regex: {
            pattern: '\\{[\\s\\S]*\\}',
            mode: 'extract_json',
            matchMode: 'first_overall',
            outputMode: 'object',
          },
        },
      },
      {
        id: 'node-regex-params-translate-en-pl',
        type: 'regex',
        title: 'Regex Parameters JSON',
        description: '',
        position: { x: 380, y: 280 },
        data: {},
        inputs: ['value', 'prompt', 'regexCallback'],
        outputs: ['grouped', 'matches', 'value', 'aiPrompt'],
        config: {
          regex: {
            pattern: '\\{[\\s\\S]*\\}',
            mode: 'extract_json',
            matchMode: 'first_overall',
            outputMode: 'object',
          },
        },
      },
      {
        id: 'node-db-update-translate-en-pl',
        type: 'database',
        title: 'Database Update',
        description: '',
        position: { x: 760, y: 200 },
        data: {},
        inputs: ['entityId', 'entityType', 'value', 'result', 'bundle', 'context'],
        outputs: ['result', 'bundle'],
        config: {
          database: {
            operation: 'update',
            entityType: 'product',
            updatePayloadMode: 'mapping',
            updateTemplate: '',
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
            mappings: [
              {
                sourcePath: 'description_pl',
                sourcePort: 'value',
                targetPath: 'description_pl',
              },
              {
                sourcePath: 'parameters',
                sourcePort: 'result',
                targetPath: 'parameters',
              },
            ],
          },
        },
      },
    ],
    edges: [
      {
        id: 'edge-parser-desc',
        from: 'node-parser-translate-en-pl',
        to: 'node-regex-translate-en-pl',
        fromPort: 'description_en',
        toPort: 'text',
      },
      {
        id: 'edge-parser-params',
        from: 'node-parser-translate-en-pl',
        to: 'node-regex-params-translate-en-pl',
        fromPort: 'parameters',
        toPort: 'text',
      },
      {
        id: 'edge-parser-bundle',
        from: 'node-parser-translate-en-pl',
        to: 'node-db-update-translate-en-pl',
        fromPort: 'bundle',
        toPort: 'bundle',
      },
      {
        id: 'edge-desc-update',
        from: 'node-regex-translate-en-pl',
        to: 'node-db-update-translate-en-pl',
        fromPort: 'value',
        toPort: 'value',
      },
      {
        id: 'edge-params-update',
        from: 'node-regex-params-translate-en-pl',
        to: 'node-db-update-translate-en-pl',
        fromPort: 'value',
        toPort: 'result',
      },
    ],
    extensions: {
      aiPathsStarter: {
        starterKey: 'translation_en_pl',
        templateId: 'starter_translation_en_pl',
        templateVersion: 3,
        seededDefault: false,
      },
    },
  }) as PathConfig;

const buildStarterRefreshRecords = (): AiPathsSettingRecord[] => [
  {
    key: AI_PATHS_INDEX_KEY,
    value: JSON.stringify([
      {
        id: 'path_translation_v2',
        name: 'Translation EN->PL Description + Parameters v2',
        createdAt: '2026-03-03T10:00:00.000Z',
        updatedAt: '2026-03-03T10:00:00.000Z',
      },
    ]),
  },
  {
    key: `${AI_PATHS_CONFIG_KEY_PREFIX}path_translation_v2`,
    value: JSON.stringify(buildOutdatedTranslationStarterConfig()),
  },
];

const buildBrokenBlwoStarterRefreshRecords = (): AiPathsSettingRecord[] => [
  {
    key: AI_PATHS_INDEX_KEY,
    value: JSON.stringify([
      {
        id: 'path_base_export_blwo_v1',
        name: 'Base Export Workflow (BLWo)',
        createdAt: '2026-03-03T10:00:00.000Z',
        updatedAt: '2026-03-03T10:00:00.000Z',
      },
    ]),
  },
  {
    key: `${AI_PATHS_CONFIG_KEY_PREFIX}path_base_export_blwo_v1`,
    value: JSON.stringify({
      id: 'path_base_export_blwo_v1',
      name: 'Base Export Workflow (BLWo)',
      nodes: [{ id: 'node-broken-trigger', type: 'trigger' }],
      edges: [],
    }),
  },
];

const buildBrokenRecoverableTranslationDefaultPathRecords = (): AiPathsSettingRecord[] => [
  {
    key: AI_PATHS_INDEX_KEY,
    value: JSON.stringify([
      {
        id: 'path_96708d',
        name: 'Translation EN->PL Description + Parameters',
        createdAt: '2026-03-03T10:00:00.000Z',
        updatedAt: '2026-03-03T10:00:00.000Z',
      },
    ]),
  },
  {
    key: `${AI_PATHS_CONFIG_KEY_PREFIX}path_96708d`,
    value: '{"broken":',
  },
];

const buildEmptyRecoveryRecords = (): AiPathsSettingRecord[] => [
  {
    key: AI_PATHS_INDEX_KEY,
    value: '[]',
  },
  {
    key: AI_PATHS_TRIGGER_BUTTONS_KEY,
    value: '[]',
  },
];

describe('AI Paths maintenance forward-only action ids', () => {
  it('does not surface removed runtime migration action ids', () => {
    const report = buildAiPathsMaintenanceReport(buildSettingsRecords());

    expect(report.actions.some((action) => action.id === 'migrate_legacy_starter_workflows')).toBe(
      false
    );
    expect(report.actions.some((action) => action.id === 'upgrade_runtime_input_contracts')).toBe(
      false
    );
    expect(report.actions.some((action) => action.id === 'upgrade_server_execution_mode')).toBe(
      false
    );
  });

  it('ignores deprecated and unknown maintenance action ids in requested input', () => {
    const report = buildAiPathsMaintenanceReport(buildSettingsRecords());
    const resolved = resolveRequestedMaintenanceActionIds(report, [
      'upgrade_translation_en_pl',
      'ensure_parameter_inference_defaults',
      'unknown',
      'repair_path_index',
      'upgrade_runtime_input_contracts',
    ] as unknown as AiPathsMaintenanceActionId[]);
    expect(resolved).toEqual(['repair_path_index']);
  });

  it('surfaces the generic starter refresh action for outdated starter-derived configs', () => {
    const report = buildAiPathsMaintenanceReport(buildStarterRefreshRecords());

    expect(report.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'refresh_starter_workflow_configs',
          status: 'pending',
          affectedRecords: 1,
        }),
      ])
    );
  });

  it('surfaces static recovery restore when canonical workflows are missing from settings', () => {
    const report = buildAiPathsMaintenanceReport(buildEmptyRecoveryRecords());

    expect(report.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'restore_static_recovery_bundle',
          status: 'pending',
        }),
      ])
    );
    expect(report.actions.some((action) => action.id === 'ensure_starter_workflow_defaults')).toBe(
      false
    );
  });

  it('restores canonical AI Paths and trigger buttons from the static recovery bundle', () => {
    const result = runMaintenanceAction({
      actionId: 'restore_static_recovery_bundle',
      records: buildEmptyRecoveryRecords(),
    });

    expect(result.success).toBe(true);
    expect(result.affectedCount).toBeGreaterThan(0);
    expect(
      result.nextRecords.some(
        (record) => record.key === `${AI_PATHS_CONFIG_KEY_PREFIX}path_descv3lite`
      )
    ).toBe(true);
    expect(
      result.nextRecords.some((record) => record.key === `${AI_PATHS_CONFIG_KEY_PREFIX}path_96708d`)
    ).toBe(true);
    expect(
      result.nextRecords.some(
        (record) => record.key === `${AI_PATHS_CONFIG_KEY_PREFIX}path_marketplace_copy_debrand_v1`
      )
    ).toBe(true);

    const triggerButtonsRecord = result.nextRecords.find(
      (record) => record.key === AI_PATHS_TRIGGER_BUTTONS_KEY
    );
    if (!triggerButtonsRecord) throw new Error('Expected trigger buttons record');
    const triggerButtons = JSON.parse(triggerButtonsRecord.value) as Array<Record<string, unknown>>;
    expect(
      triggerButtons.some((button) => button['id'] === '4c07d35b-ea92-4d1f-b86b-c586359f68de')
    ).toBe(true);
    expect(
      triggerButtons.some((button) => button['id'] === 'bdf0f5d2-a300-4f79-991c-2b5f1e0ef3a4')
    ).toBe(true);
  });

  it('refreshes outdated starter-derived translation configs through the generic overlay path', () => {
    const result = runMaintenanceAction({
      actionId: 'refresh_starter_workflow_configs',
      records: buildStarterRefreshRecords(),
    });

    expect(result.success).toBe(true);
    expect(result.affectedCount).toBe(1);

    const configRecord = result.nextRecords.find(
      (record) => record.key === `${AI_PATHS_CONFIG_KEY_PREFIX}path_translation_v2`
    );
    if (!configRecord) throw new Error('Expected refreshed translation config record');

    const parsed = JSON.parse(configRecord.value) as PathConfig;
    const report = evaluateRunPreflight({
      nodes: parsed.nodes,
      edges: parsed.edges,
      aiPathsValidation: { enabled: true },
      strictFlowMode: true,
      mode: 'full',
    });

    expect(parsed.extensions?.['aiPathsStarter']).toEqual(
      expect.objectContaining({
        templateId: 'starter_translation_en_pl',
        templateVersion: 6,
      })
    );
    const databaseNode = parsed.nodes.find(
      (node) => node.type === 'database' && node.config?.database?.operation === 'update'
    );
    expect(databaseNode?.config?.database).toEqual(
      expect.objectContaining({
        updatePayloadMode: 'custom',
        updateTemplate: expect.stringContaining('{{result.parameters}}'),
        mappings: expect.arrayContaining([
          expect.objectContaining({
            targetPath: 'description_pl',
            sourcePort: 'value',
            sourcePath: 'description_pl',
          }),
          expect.objectContaining({
            targetPath: 'parameters',
            sourcePort: 'result',
            sourcePath: 'parameters',
          }),
        ]),
      })
    );
    expect(report.shouldBlock).toBe(true);
    expect(report.dependencyReport?.errors ?? 0).toBeGreaterThan(0);
  });

  it('repairs broken seeded BLWo starter configs through the generic refresh action', () => {
    const report = buildAiPathsMaintenanceReport(buildBrokenBlwoStarterRefreshRecords());

    expect(report.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'refresh_starter_workflow_configs',
          status: 'pending',
          affectedRecords: 1,
        }),
      ])
    );

    const result = runMaintenanceAction({
      actionId: 'refresh_starter_workflow_configs',
      records: buildBrokenBlwoStarterRefreshRecords(),
    });

    expect(result.success).toBe(true);
    expect(result.affectedCount).toBe(1);

    const configRecord = result.nextRecords.find(
      (record) => record.key === `${AI_PATHS_CONFIG_KEY_PREFIX}path_base_export_blwo_v1`
    );
    if (!configRecord) throw new Error('Expected refreshed BLWo config record');

    const parsed = JSON.parse(configRecord.value) as PathConfig;
    expect(parsed.id).toBe('path_base_export_blwo_v1');
    expect(parsed.name).toBe('Base Export Workflow (BLWo)');
    expect(parsed.nodes.some((node) => node.type === 'trigger')).toBe(true);
    expect(parsed.extensions?.['aiPathsStarter']).toEqual(
      expect.objectContaining({
        templateId: 'starter_base_export_blwo',
      })
    );
  });

  it('repairs broken recoverable translation default-path configs through the generic refresh action', () => {
    const result = runMaintenanceAction({
      actionId: 'refresh_starter_workflow_configs',
      records: buildBrokenRecoverableTranslationDefaultPathRecords(),
    });

    expect(result.success).toBe(true);
    expect(result.affectedCount).toBe(1);

    const configRecord = result.nextRecords.find(
      (record) => record.key === `${AI_PATHS_CONFIG_KEY_PREFIX}path_96708d`
    );
    if (!configRecord) throw new Error('Expected repaired translation config record');

    const parsed = JSON.parse(configRecord.value) as PathConfig;
    expect(parsed.id).toBe('path_96708d');
    expect(parsed.nodes.some((node) => node.type === 'trigger')).toBe(true);
    expect(parsed.extensions?.['aiPathsStarter']).toEqual(
      expect.objectContaining({
        templateId: 'starter_translation_en_pl',
        seededDefault: false,
      })
    );
  });
});
