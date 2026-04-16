import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PathConfig, PathMeta } from '@/shared/contracts/ai-paths';
import type { RuntimeState } from '@/shared/contracts/ai-paths-runtime';
import { DEFAULT_AI_PATHS_VALIDATION_CONFIG } from '@/shared/lib/ai-paths/core/validation-engine';
import { createDefaultPathConfig } from '@/shared/lib/ai-paths/core/utils';

import { useAiPathsSettingsModeActions } from '../useAiPathsSettingsModeActions';

type ModeActionsInput = Parameters<typeof useAiPathsSettingsModeActions>[0];
const setPathsGraphMock = vi.fn();
const setPathConfigsGraphMock = vi.fn();
const setExecutionModeGraphMock = vi.fn();
const setFlowIntensityGraphMock = vi.fn();
const setRunModeGraphMock = vi.fn();
const setStrictFlowModeGraphMock = vi.fn();
const setBlockedRunPolicyGraphMock = vi.fn();
const setHistoryRetentionPassesGraphMock = vi.fn();
const setIsPathLockedGraphMock = vi.fn();
const setIsPathActiveGraphMock = vi.fn();
const graphActionsMock = {
  setPaths: setPathsGraphMock,
  setPathConfigs: setPathConfigsGraphMock,
  setExecutionMode: setExecutionModeGraphMock,
  setFlowIntensity: setFlowIntensityGraphMock,
  setRunMode: setRunModeGraphMock,
  setStrictFlowMode: setStrictFlowModeGraphMock,
  setBlockedRunPolicy: setBlockedRunPolicyGraphMock,
  setHistoryRetentionPasses: setHistoryRetentionPassesGraphMock,
  setIsPathLocked: setIsPathLockedGraphMock,
  setIsPathActive: setIsPathActiveGraphMock,
};

vi.mock('@/features/ai/ai-paths/context/GraphContext', () => ({
  useGraphActions: () => graphActionsMock,
}));

const emptyRuntimeState = (): RuntimeState =>
  ({
    status: 'idle',
    nodeStatuses: {},
    nodeOutputs: {},
    variables: {},
    events: [],
    inputs: {},
    outputs: {},
  }) as RuntimeState;

describe('useAiPathsSettingsModeActions', () => {
  beforeEach(() => {
    setPathsGraphMock.mockReset();
    setPathConfigsGraphMock.mockReset();
    setExecutionModeGraphMock.mockReset();
    setFlowIntensityGraphMock.mockReset();
    setRunModeGraphMock.mockReset();
    setStrictFlowModeGraphMock.mockReset();
    setBlockedRunPolicyGraphMock.mockReset();
    setHistoryRetentionPassesGraphMock.mockReset();
    setIsPathLockedGraphMock.mockReset();
    setIsPathActiveGraphMock.mockReset();
  });

  it('preserves existing path version when toggling active state', async () => {
    const activePathId = 'path_syr8f4';
    const existingVersion = 12;
    const now = '2026-02-24T00:00:00.000Z';

    const pathConfig: PathConfig = {
      ...createDefaultPathConfig(activePathId),
      id: activePathId,
      name: 'Parameter Inference',
      version: existingVersion,
      isActive: true,
      updatedAt: now,
    };
    const paths: PathMeta[] = [
      {
        id: activePathId,
        name: 'Parameter Inference',
        createdAt: now,
        updatedAt: now,
      },
    ];
    const pathConfigs: Record<string, PathConfig> = {
      [activePathId]: pathConfig,
    };

    const persistPathSettings = vi
      .fn<
        (nextPaths: PathMeta[], nextActivePathId: string, nextConfig: PathConfig) => Promise<void>
      >()
      .mockResolvedValue(undefined);
    const persistSettingsBulk = vi
      .fn<(entries: Array<{ key: string; value: string }>) => Promise<void>>()
      .mockResolvedValue(undefined);
    const reportAiPathsError = vi.fn();
    const toast = vi.fn();

    const input: ModeActionsInput = {
      activePathId,
      isPathLocked: false,
      isPathActive: true,
      activeTrigger: 'Product Modal - Infer Parameters',
      executionMode: 'server',
      flowIntensity: 'medium',
      runMode: 'manual',
      strictFlowMode: true,
      blockedRunPolicy: 'fail_run',
      aiPathsValidation: DEFAULT_AI_PATHS_VALIDATION_CONFIG,
      historyRetentionPasses: 10,
      nodes: [],
      edges: [],
      pathName: 'Parameter Inference',
      pathDescription: '',
      parserSamples: {},
      updaterSamples: {},
      runtimeState: emptyRuntimeState(),
      lastRunAt: null,
      selectedNodeId: null,
      pathConfigs,
      paths,
      persistPathSettings,
      persistSettingsBulk,
      reportAiPathsError,
      toast,
    };

    const { result } = renderHook(() => useAiPathsSettingsModeActions(input));

    act(() => {
      result.current.handleTogglePathActive();
    });

    expect(setIsPathActiveGraphMock).toHaveBeenCalledWith(false);
    expect(setPathConfigsGraphMock).toHaveBeenCalledTimes(1);

    const setPathConfigsArg = setPathConfigsGraphMock.mock.calls[0]?.[0] as
      | ((prev: Record<string, PathConfig>) => Record<string, PathConfig>)
      | undefined;
    expect(setPathConfigsArg).toEqual(expect.any(Function));
    if (!setPathConfigsArg) {
      throw new Error('Expected setPathConfigs updater to be called.');
    }
    const nextConfigs = setPathConfigsArg({
      [activePathId]: pathConfig,
    });
    expect(nextConfigs[activePathId]?.version).toBe(existingVersion);
    expect(nextConfigs[activePathId]?.isActive).toBe(false);

    await waitFor(() => {
      expect(persistPathSettings).toHaveBeenCalledTimes(1);
    });
    const persistedConfig = persistPathSettings.mock.calls[0]?.[2];
    expect(persistedConfig?.version).toBe(existingVersion);
    expect(persistedConfig?.isActive).toBe(false);
  });
});
