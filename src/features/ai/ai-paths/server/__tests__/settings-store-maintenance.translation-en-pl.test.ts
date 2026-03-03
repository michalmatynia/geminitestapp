import { describe, expect, it } from 'vitest';

import {
  buildAiPathsMaintenanceReport,
  resolveRequestedMaintenanceActionIds,
  runMaintenanceAction,
} from '@/features/ai/ai-paths/server/settings-store.maintenance';
import type { AiPathsSettingRecord } from '@/features/ai/ai-paths/server/settings-store.constants';
import {
  AI_PATHS_CONFIG_KEY_PREFIX,
  AI_PATHS_INDEX_KEY,
} from '@/features/ai/ai-paths/server/settings-store.constants';
import { needsRuntimeInputContractsUpgrade } from '@/features/ai/ai-paths/server/settings-store-runtime-input-contracts';

const buildLegacyTranslationConfig = (): Record<string, unknown> => ({
  id: 'path_translation_v2',
  name: 'Translation EN->PL Description + Parameters v2',
  version: 1,
  description: '',
  trigger: 'manual',
  updatedAt: '2026-03-03T10:00:00.000Z',
  nodes: [
    {
      id: 'node-regex-translate-en-pl',
      type: 'regex',
      inputs: ['value', 'prompt', 'regexCallback'],
      outputs: ['grouped', 'matches', 'value', 'aiPrompt'],
      position: { x: 0, y: 0 },
      data: {},
    },
    {
      id: 'node-db-update-translate-en-pl',
      type: 'database',
      inputs: ['entityId', 'entityType', 'value', 'result', 'bundle'],
      outputs: ['result', 'bundle'],
      position: { x: 320, y: 0 },
      data: {},
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
              sourcePort: 'value',
              targetPath: 'parameters',
            },
          ],
        },
      },
    },
  ],
  edges: [
    {
      id: 'edge-description',
      from: 'node-regex-translate-en-pl',
      to: 'node-db-update-translate-en-pl',
      fromPort: 'value',
      toPort: 'value',
    },
  ],
});

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
        id: 'path_translation_v2',
        name: 'Translation EN->PL Description + Parameters v2',
        createdAt: '2026-03-03T10:00:00.000Z',
        updatedAt: '2026-03-03T10:00:00.000Z',
      },
      {
        id: 'path_model_legacy',
        name: 'Legacy Model Path',
        createdAt: '2026-03-03T10:00:00.000Z',
        updatedAt: '2026-03-03T10:00:00.000Z',
      },
    ]),
  },
  {
    key: `${AI_PATHS_CONFIG_KEY_PREFIX}path_translation_v2`,
    value: JSON.stringify(buildLegacyTranslationConfig()),
  },
  {
    key: `${AI_PATHS_CONFIG_KEY_PREFIX}path_model_legacy`,
    value: JSON.stringify(buildLegacyRuntimeContractsConfig()),
  },
];

describe('AI Paths maintenance starter workflow migration', () => {
  it('surfaces starter migration for renamed legacy translation variants by starter fingerprint', () => {
    const report = buildAiPathsMaintenanceReport(buildSettingsRecords());

    expect(
      report.actions.some((action) => action.id === 'migrate_legacy_starter_workflows')
    ).toBe(true);
    expect(report.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'migrate_legacy_starter_workflows',
          affectedRecords: 1,
        }),
        expect.objectContaining({
          id: 'upgrade_runtime_input_contracts',
          affectedRecords: 1,
        }),
      ])
    );
    expect(report.actions.some((action) => action.id === 'upgrade_translation_en_pl')).toBe(false);
  });

  it('maps deprecated translation-specific maintenance action ids to generic starter actions', () => {
    const report = buildAiPathsMaintenanceReport(buildSettingsRecords());
    const resolved = resolveRequestedMaintenanceActionIds(
      report,
      ['upgrade_translation_en_pl'] as unknown as Parameters<
        typeof resolveRequestedMaintenanceActionIds
      >[1]
    );

    expect(resolved).toEqual(['migrate_legacy_starter_workflows']);
  });

  it('maps deprecated workflow-specific default action ids to generic starter defaults action', () => {
    const report = buildAiPathsMaintenanceReport(buildSettingsRecords());
    const resolved = resolveRequestedMaintenanceActionIds(
      report,
      [
        'ensure_parameter_inference_defaults',
        'ensure_description_inference_defaults',
        'ensure_base_export_defaults',
      ] as unknown as Parameters<typeof resolveRequestedMaintenanceActionIds>[1]
    );

    expect(resolved).toEqual(['ensure_starter_workflow_defaults']);
  });

  it('rewrites renamed legacy translation configs when the graph matches starter lineage', () => {
    const result = runMaintenanceAction({
      actionId: 'migrate_legacy_starter_workflows',
      records: buildSettingsRecords(),
    });

    expect(result.success).toBe(true);
    expect(result.affectedCount).toBe(1);

    const translationRecord = result.nextRecords.find(
      (entry) => entry.key === `${AI_PATHS_CONFIG_KEY_PREFIX}path_translation_v2`
    );
    if (!translationRecord) throw new Error('Expected translation config record');

    const parsed = JSON.parse(translationRecord.value) as Record<string, unknown>;
    const nodes = Array.isArray(parsed['nodes'])
      ? (parsed['nodes'] as Array<Record<string, unknown>>)
      : [];
    const updateNode = nodes.find(
      (node: Record<string, unknown>) => node['id'] === 'node-db-update-translate-en-pl'
    );
    const databaseConfig = ((updateNode?.['config'] as Record<string, unknown>)?.['database'] ??
      {}) as Record<string, unknown>;
    expect(databaseConfig['updatePayloadMode']).toBe('custom');
    expect(String(databaseConfig['updateTemplate'] ?? '')).toContain('"description_pl": "{{value.description_pl}}"');
    expect(String(databaseConfig['updateTemplate'] ?? '')).toContain('"parameters": {{value.parameters}}');
    expect((parsed['extensions'] as Record<string, unknown>)?.['aiPathsStarter']).toEqual(
      expect.objectContaining({
        starterKey: 'translation_en_pl',
        templateId: 'starter_translation_en_pl',
      })
    );
  });

  it('is idempotent when legacy translation configs are already migrated', () => {
    const firstPass = runMaintenanceAction({
      actionId: 'migrate_legacy_starter_workflows',
      records: buildSettingsRecords(),
    });
    const secondPass = runMaintenanceAction({
      actionId: 'migrate_legacy_starter_workflows',
      records: firstPass.nextRecords,
    });

    expect(firstPass.affectedCount).toBe(1);
    expect(secondPass.affectedCount).toBe(0);

    const runtimeContractsRecord = secondPass.nextRecords.find(
      (entry) => entry.key === `${AI_PATHS_CONFIG_KEY_PREFIX}path_model_legacy`
    );
    if (!runtimeContractsRecord) throw new Error('Expected runtime-contract config record');

    expect(needsRuntimeInputContractsUpgrade(runtimeContractsRecord.value)).toBe(true);
  });
});
