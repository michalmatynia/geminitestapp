import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PathConfig } from '@/shared/contracts/ai-paths';
import { createDefaultPathConfig } from '@/shared/lib/ai-paths';
import { updateAiPathsSetting } from '@/shared/lib/ai-paths/settings-store-client';

import { persistLegacyTriggerContextModeRepair } from '../legacy-trigger-context-mode-persistence';

vi.mock('@/shared/lib/ai-paths/settings-store-client', async () => {
  const actual = await vi.importActual<
    typeof import('@/shared/lib/ai-paths/settings-store-client')
  >('@/shared/lib/ai-paths/settings-store-client');
  return {
    ...actual,
    updateAiPathsSetting: vi.fn(async (key: string, value: string) => ({ key, value })),
  };
});

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: vi.fn(),
}));

const mockedUpdateAiPathsSetting = vi.mocked(updateAiPathsSetting);

const buildLegacyTriggerConfig = (pathId: string): PathConfig => {
  const pathConfig = createDefaultPathConfig(pathId);
  const seedNode = pathConfig.nodes[0];
  if (!seedNode) {
    throw new Error('Expected default path config to include a seed node.');
  }
  pathConfig.nodes = [
    {
      ...seedNode,
      type: 'trigger',
      title: 'Trigger: Legacy',
      inputs: ['context'],
      outputs: ['trigger', 'context', 'entityId', 'entityType'],
      config: {
        trigger: {
          event: 'manual',
          contextMode: 'simulation_preferred',
        },
      },
    },
  ];
  pathConfig.edges = [];
  return pathConfig;
};

describe('legacy-trigger-context-mode-persistence', () => {
  beforeEach(() => {
    mockedUpdateAiPathsSetting.mockReset().mockImplementation(async (key: string, value: string) => ({
      key,
      value,
    }));
  });

  it('skips write-back when the raw payload has no legacy trigger modes', () => {
    const config = createDefaultPathConfig('path_clean');

    const result = persistLegacyTriggerContextModeRepair({
      pathId: config.id,
      rawPayload: JSON.stringify(config),
      repairedConfig: config,
      source: 'test',
      action: 'skipCleanPayload',
    });

    expect(result).toBe(false);
    expect(mockedUpdateAiPathsSetting).not.toHaveBeenCalled();
  });

  it('persists repaired trigger configs for legacy payloads', async () => {
    const legacyConfig = buildLegacyTriggerConfig('path_legacy');
    const repairedConfig: PathConfig = {
      ...legacyConfig,
      nodes: legacyConfig.nodes.map((node, index) =>
        index === 0
          ? {
              ...node,
              config: {
                ...node.config,
                trigger: {
                  ...node.config?.trigger,
                  contextMode: 'trigger_only',
                },
              },
            }
          : node
      ),
    };

    const result = persistLegacyTriggerContextModeRepair({
      pathId: legacyConfig.id,
      rawPayload: JSON.stringify(legacyConfig),
      repairedConfig,
      source: 'test',
      action: 'persistLegacyPayload',
    });

    expect(result).toBe(true);
    await Promise.resolve();
    expect(mockedUpdateAiPathsSetting).toHaveBeenCalledWith(
      `ai_paths_config_${legacyConfig.id}`,
      expect.any(String)
    );
  });

  it('dedupes only the in-flight write for the same path id', async () => {
    const legacyConfig = buildLegacyTriggerConfig('path_dedupe');
    const repairedConfig: PathConfig = {
      ...legacyConfig,
      nodes: legacyConfig.nodes.map((node, index) =>
        index === 0
          ? {
              ...node,
              config: {
                ...node.config,
                trigger: {
                  ...node.config?.trigger,
                  contextMode: 'trigger_only',
                },
              },
            }
          : node
      ),
    };

    let resolveWrite: (() => void) | null = null;
    mockedUpdateAiPathsSetting.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveWrite = resolve;
        }).then(() => ({
          key: `ai_paths_config_${legacyConfig.id}`,
          value: JSON.stringify(repairedConfig),
        }))
    );

    persistLegacyTriggerContextModeRepair({
      pathId: legacyConfig.id,
      rawPayload: JSON.stringify(legacyConfig),
      repairedConfig,
      source: 'test',
      action: 'dedupeInflightA',
    });
    persistLegacyTriggerContextModeRepair({
      pathId: legacyConfig.id,
      rawPayload: JSON.stringify(legacyConfig),
      repairedConfig,
      source: 'test',
      action: 'dedupeInflightB',
    });

    expect(mockedUpdateAiPathsSetting).toHaveBeenCalledTimes(1);
    resolveWrite?.();
    await new Promise((resolve) => setTimeout(resolve, 0));

    persistLegacyTriggerContextModeRepair({
      pathId: legacyConfig.id,
      rawPayload: JSON.stringify(legacyConfig),
      repairedConfig,
      source: 'test',
      action: 'retryAfterInflight',
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockedUpdateAiPathsSetting).toHaveBeenCalledTimes(2);
  });
});
