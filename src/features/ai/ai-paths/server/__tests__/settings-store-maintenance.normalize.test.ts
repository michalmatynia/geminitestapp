import { describe, expect, it } from 'vitest';

import { runMaintenanceAction } from '@/features/ai/ai-paths/server/settings-store.maintenance';
import { restoreStaticStarterWorkflowBundle } from '@/features/ai/ai-paths/server/starter-workflows-settings';
import {
  AI_PATHS_CONFIG_KEY_PREFIX,
  AI_PATHS_INDEX_KEY,
  AI_PATHS_TRIGGER_BUTTONS_KEY,
} from '@/features/ai/ai-paths/server/settings-store.constants';

const buildStaleNormalizeRefreshRecords = () =>
  restoreStaticStarterWorkflowBundle([
    {
      key: AI_PATHS_INDEX_KEY,
      value: '[]',
    },
    {
      key: AI_PATHS_TRIGGER_BUTTONS_KEY,
      value: '[]',
    },
  ]).nextRecords
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
      if (node['type'] !== 'model') return node;
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

describe('runMaintenanceAction refresh_starter_workflow_configs for Normalize starter', () => {
  it('preserves edited Normalize model settings while refreshing stale starter configs', () => {
    const result = runMaintenanceAction({
      actionId: 'refresh_starter_workflow_configs',
      records: buildStaleNormalizeRefreshRecords(),
    });

    expect(result.success).toBe(true);
    expect(result.affectedCount).toBe(1);

    const configRecord = result.nextRecords.find(
      (record) => record.key === `${AI_PATHS_CONFIG_KEY_PREFIX}path_name_normalize_v1`
    );
    if (!configRecord) throw new Error('Expected normalize config record');

    const parsed = JSON.parse(configRecord.value) as Record<string, unknown>;
    const nodes = Array.isArray(parsed['nodes'])
      ? (parsed['nodes'] as Array<Record<string, unknown>>)
      : [];
    const modelNode = nodes.find((node) => {
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
      modelNode?.['config'] &&
      typeof modelNode['config'] === 'object' &&
      (modelNode['config'] as Record<string, unknown>)['model'] &&
      typeof (modelNode['config'] as Record<string, unknown>)['model'] === 'object'
        ? ((modelNode['config'] as Record<string, unknown>)['model'] as Record<string, unknown>)
        : null;

    expect(modelConfig).toEqual(
      expect.objectContaining({
        temperature: 0.35,
        maxTokens: 1337,
        systemPrompt: 'Only return normalized output.',
        waitForResult: false,
      })
    );
  });
});
