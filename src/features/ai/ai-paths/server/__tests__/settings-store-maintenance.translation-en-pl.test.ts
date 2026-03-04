import { describe, expect, it } from 'vitest';

import {
  buildAiPathsMaintenanceReport,
  resolveRequestedMaintenanceActionIds,
} from '@/features/ai/ai-paths/server/settings-store.maintenance';
import type {
  AiPathsMaintenanceActionId,
  AiPathsSettingRecord,
} from '@/features/ai/ai-paths/server/settings-store.constants';
import {
  AI_PATHS_CONFIG_KEY_PREFIX,
  AI_PATHS_INDEX_KEY,
} from '@/features/ai/ai-paths/server/settings-store.constants';

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
});
