import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Dispatch, SetStateAction } from 'react';

import type {
  PathConfig,
  PathMeta,
  RuntimeState,
} from '@/shared/lib/ai-paths';
import {
  DEFAULT_AI_PATHS_VALIDATION_CONFIG,
  createDefaultPathConfig,
} from '@/shared/lib/ai-paths';

import { useAiPathsSettingsModeActions } from '../useAiPathsSettingsModeActions';

type ModeActionsInput = Parameters<typeof useAiPathsSettingsModeActions>[0];

const createDispatchMock = <T>(): {
  dispatch: Dispatch<SetStateAction<T>>;
  mock: ReturnType<typeof vi.fn<(value: SetStateAction<T>) => void>>;
} => {
  const mock = vi.fn<(value: SetStateAction<T>) => void>();
  return {
    dispatch: mock as Dispatch<SetStateAction<T>>,
    mock,
  };
};

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

    const setIsPathLocked = createDispatchMock<boolean>();
    const setIsPathActive = createDispatchMock<boolean>();
    const setExecutionMode = createDispatchMock<ModeActionsInput['executionMode']>();
    const setFlowIntensity = createDispatchMock<ModeActionsInput['flowIntensity']>();
    const setRunMode = createDispatchMock<ModeActionsInput['runMode']>();
    const setStrictFlowMode = createDispatchMock<boolean>();
    const setBlockedRunPolicy =
      createDispatchMock<ModeActionsInput['blockedRunPolicy']>();
    const setHistoryRetentionPasses = createDispatchMock<number>();
    const setPaths = createDispatchMock<PathMeta[]>();
    const setPathConfigs = createDispatchMock<Record<string, PathConfig>>();

    const persistPathSettings = vi
      .fn<
        (
          nextPaths: PathMeta[],
          nextActivePathId: string,
          nextConfig: PathConfig,
        ) => Promise<void>
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
      setIsPathLocked: setIsPathLocked.dispatch,
      setIsPathActive: setIsPathActive.dispatch,
      activeTrigger: 'Product Modal - Infer Parameters',
      executionMode: 'server',
      setExecutionMode: setExecutionMode.dispatch,
      flowIntensity: 'medium',
      setFlowIntensity: setFlowIntensity.dispatch,
      runMode: 'manual',
      setRunMode: setRunMode.dispatch,
      strictFlowMode: true,
      setStrictFlowMode: setStrictFlowMode.dispatch,
      blockedRunPolicy: 'fail_run',
      setBlockedRunPolicy: setBlockedRunPolicy.dispatch,
      aiPathsValidation: DEFAULT_AI_PATHS_VALIDATION_CONFIG,
      historyRetentionPasses: 10,
      setHistoryRetentionPasses: setHistoryRetentionPasses.dispatch,
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
      setPaths: setPaths.dispatch,
      setPathConfigs: setPathConfigs.dispatch,
      persistPathSettings,
      persistSettingsBulk,
      reportAiPathsError,
      toast,
    };

    const { result } = renderHook(() => useAiPathsSettingsModeActions(input));

    act(() => {
      result.current.handleTogglePathActive();
    });

    expect(setIsPathActive.mock).toHaveBeenCalledWith(false);
    expect(setPathConfigs.mock).toHaveBeenCalledTimes(1);

    const setPathConfigsArg = setPathConfigs.mock.mock.calls[0]?.[0];
    expect(typeof setPathConfigsArg).toBe('function');
    const nextConfigs = (
      setPathConfigsArg as (
        prev: Record<string, PathConfig>,
      ) => Record<string, PathConfig>
    )({
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
