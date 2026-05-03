import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PathConfig, PathMeta } from '@/shared/contracts/ai-paths';
import { createDefaultPathConfig } from '@/shared/lib/ai-paths/core/utils';
import type { ConfirmConfig } from '@/shared/hooks/ui/useConfirm';
import { clearAiPathRuns } from '@/shared/lib/ai-paths/api/client';
import { deleteAiPathsSettings } from '@/shared/lib/ai-paths/settings-store-client';

import { useAiPathsSettingsPathActions } from '../useAiPathsSettingsPathActions';

type PathActionsInput = Parameters<typeof useAiPathsSettingsPathActions>[0];

const selectNodeMock = vi.fn();
const setNodesGraphMock = vi.fn();
const setEdgesGraphMock = vi.fn();
const setPathConfigsGraphMock = vi.fn();
const setPathsGraphMock = vi.fn();
const setActivePathIdGraphMock = vi.fn();
const setPathNameGraphMock = vi.fn();
const setPathDescriptionGraphMock = vi.fn();
const setActiveTriggerGraphMock = vi.fn();
const setExecutionModeGraphMock = vi.fn();
const setFlowIntensityGraphMock = vi.fn();
const setRunModeGraphMock = vi.fn();
const setStrictFlowModeGraphMock = vi.fn();
const setBlockedRunPolicyGraphMock = vi.fn();
const setAiPathsValidationGraphMock = vi.fn();
const setIsPathLockedGraphMock = vi.fn();
const setIsPathActiveGraphMock = vi.fn();
const setRuntimeStateMock = vi.fn();
const setParserSamplesRuntimeMock = vi.fn();
const setUpdaterSamplesRuntimeMock = vi.fn();
const setLastRunAtRuntimeMock = vi.fn();
const setConfigOpenSelectionMock = vi.fn();
const setIsPathSwitchingPersistenceMock = vi.fn();

vi.mock('@/shared/lib/ai-paths/settings-store-client', async () => {
  const actual = await vi.importActual<
    typeof import('@/shared/lib/ai-paths/settings-store-client')
  >('@/shared/lib/ai-paths/settings-store-client');
  return {
    ...actual,
    fetchAiPathsSettingsByKeysCached: vi.fn(),
    fetchAiPathsSettingsCached: vi.fn(),
    deleteAiPathsSettings: vi.fn().mockResolvedValue(0),
  };
});

vi.mock('@/shared/lib/ai-paths/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/shared/lib/ai-paths/api/client')>(
    '@/shared/lib/ai-paths/api/client'
  );
  return {
    ...actual,
    clearAiPathRuns: vi.fn(),
  };
});

vi.mock('@/features/ai/ai-paths/context/SelectionContext', () => ({
  useSelectionActions: () => ({
    selectNode: selectNodeMock,
    setConfigOpen: setConfigOpenSelectionMock,
  }),
}));

vi.mock('@/features/ai/ai-paths/context/GraphContext', () => ({
  useGraphActions: () => ({
    setNodes: setNodesGraphMock,
    setEdges: setEdgesGraphMock,
    setPathConfigs: setPathConfigsGraphMock,
    setPaths: setPathsGraphMock,
    setActivePathId: setActivePathIdGraphMock,
    setPathName: setPathNameGraphMock,
    setPathDescription: setPathDescriptionGraphMock,
    setActiveTrigger: setActiveTriggerGraphMock,
    setExecutionMode: setExecutionModeGraphMock,
    setFlowIntensity: setFlowIntensityGraphMock,
    setRunMode: setRunModeGraphMock,
    setStrictFlowMode: setStrictFlowModeGraphMock,
    setBlockedRunPolicy: setBlockedRunPolicyGraphMock,
    setAiPathsValidation: setAiPathsValidationGraphMock,
    setIsPathLocked: setIsPathLockedGraphMock,
    setIsPathActive: setIsPathActiveGraphMock,
  }),
}));

vi.mock('@/features/ai/ai-paths/context/RuntimeContext', () => ({
  useRuntimeActions: () => ({
    setRuntimeState: setRuntimeStateMock,
    setParserSamples: setParserSamplesRuntimeMock,
    setUpdaterSamples: setUpdaterSamplesRuntimeMock,
    setLastRunAt: setLastRunAtRuntimeMock,
  }),
}));

vi.mock('@/features/ai/ai-paths/context/PersistenceContext', () => ({
  usePersistenceActions: () => ({
    setIsPathSwitching: setIsPathSwitchingPersistenceMock,
  }),
}));

const mockedClearAiPathRuns = vi.mocked(clearAiPathRuns);
const mockedDeleteAiPathsSettings = vi.mocked(deleteAiPathsSettings);

const buildPathMeta = (config: Pick<PathConfig, 'id' | 'name'>): PathMeta => ({
  id: config.id,
  name: config.name,
  createdAt: '2026-03-01T00:00:00.000Z',
  updatedAt: '2026-03-01T00:00:00.000Z',
});

const buildInput = (): {
  input: PathActionsInput;
  configs: { primary: PathConfig; secondary: PathConfig };
  confirm: ReturnType<typeof vi.fn>;
  persistPathSettings: ReturnType<typeof vi.fn>;
  reportAiPathsError: ReturnType<typeof vi.fn>;
  toast: ReturnType<typeof vi.fn>;
} => {
  const primary = createDefaultPathConfig('path-primary');
  primary.name = 'Primary Path';
  const secondary = createDefaultPathConfig('path-secondary');
  secondary.name = 'Secondary Path';

  const paths = [buildPathMeta(primary), buildPathMeta(secondary)];
  const confirm = vi.fn<PathActionsInput['confirm']>();
  const persistPathSettings = vi.fn<PathActionsInput['persistPathSettings']>().mockResolvedValue(
    undefined
  );
  const persistSettingsBulk = vi.fn<PathActionsInput['persistSettingsBulk']>().mockResolvedValue(
    undefined
  );
  const persistActivePathPreference = vi
    .fn<PathActionsInput['persistActivePathPreference']>()
    .mockResolvedValue(undefined);
  const reportAiPathsError = vi.fn<PathActionsInput['reportAiPathsError']>();
  const toast = vi.fn<PathActionsInput['toast']>();

  return {
    input: {
      activePathId: primary.id,
      isPathLocked: false,
      pathConfigs: {
        [primary.id]: primary,
        [secondary.id]: secondary,
      },
      paths,
      normalizeTriggerLabel: (value) => value ?? 'Product Modal - Context Filter',
      persistPathSettings,
      persistSettingsBulk,
      persistActivePathPreference,
      reportAiPathsError,
      confirm,
      toast,
    },
    configs: {
      primary,
      secondary,
    },
    confirm,
    persistPathSettings,
    reportAiPathsError,
    toast,
  };
};

describe('useAiPathsSettingsPathActions handleDeletePath', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedDeleteAiPathsSettings.mockResolvedValue(0);
  });

  it('deletes persisted run history before removing the path settings keys', async () => {
    const { input, configs, confirm, persistPathSettings, reportAiPathsError, toast } = buildInput();
    mockedClearAiPathRuns.mockResolvedValueOnce({
      ok: true,
      data: { deleted: 7, scope: 'all' },
    });

    const { result } = renderHook(() => useAiPathsSettingsPathActions(input));

    await act(async () => {
      await result.current.handleDeletePath(configs.primary.id);
    });

    const confirmConfig = confirm.mock.calls[0]?.[0] as ConfirmConfig;
    await act(async () => {
      await confirmConfig.onConfirm?.();
    });

    expect(mockedClearAiPathRuns).toHaveBeenCalledWith({
      pathId: configs.primary.id,
      scope: 'all',
    });
    expect(persistPathSettings).toHaveBeenCalledWith(
      [buildPathMeta(configs.secondary)],
      configs.secondary.id,
      configs.secondary
    );
    expect(mockedDeleteAiPathsSettings).toHaveBeenCalledWith([
      `ai_paths_config_${configs.primary.id}`,
      `ai_paths_debug_${configs.primary.id}`,
    ]);
    expect(reportAiPathsError).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith('Path and history deleted.', {
      variant: 'success',
    });
  });

  it('restores the previous client state when history cleanup fails', async () => {
    const { input, configs, confirm, persistPathSettings, reportAiPathsError, toast } = buildInput();
    mockedClearAiPathRuns.mockResolvedValueOnce({
      ok: false,
      error: 'history purge failed',
    });

    const { result } = renderHook(() => useAiPathsSettingsPathActions(input));

    await act(async () => {
      await result.current.handleDeletePath(configs.primary.id);
    });

    const confirmConfig = confirm.mock.calls[0]?.[0] as ConfirmConfig;
    await act(async () => {
      await confirmConfig.onConfirm?.();
    });

    expect(persistPathSettings).not.toHaveBeenCalled();
    expect(mockedDeleteAiPathsSettings).not.toHaveBeenCalled();
    expect(reportAiPathsError).toHaveBeenCalledWith(
      expect.any(Error),
      { action: 'deletePath', pathId: configs.primary.id },
      'Failed to delete path and history:'
    );
    const reportedError = reportAiPathsError.mock.calls[0]?.[0] as Error;
    expect(reportedError.message).toContain('history purge failed');
    expect(setPathsGraphMock).toHaveBeenLastCalledWith(input.paths);
    expect(setPathConfigsGraphMock).toHaveBeenLastCalledWith(input.pathConfigs);
    expect(setActivePathIdGraphMock).toHaveBeenLastCalledWith(input.activePathId);
    expect(toast).toHaveBeenCalledWith('Failed to delete path and history.', {
      variant: 'error',
    });
  });
});
