import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePathConfigHandlers } from '../usePathConfigHandlers';

const mockState = vi.hoisted(() => ({
  toast: vi.fn(),
  graphState: {
    activePathId: 'path-1' as string | null,
    isPathLocked: false,
  },
  graphActions: {
    setExecutionMode: vi.fn(),
    setFlowIntensity: vi.fn(),
    setRunMode: vi.fn(),
    setPathConfigs: vi.fn(),
  },
  createDefaultPathConfig: vi.fn((id: string) => ({
    id,
    executionMode: 'server',
    flowIntensity: 'medium',
    runMode: 'manual',
    marker: 'default-config',
  })),
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  useToast: () => ({ toast: mockState.toast }),
}));

vi.mock('@/shared/ui', () => ({}));

vi.mock('@/features/ai/ai-paths/context', () => ({
  usePathMetadataState: () => mockState.graphState,
  useGraphActions: () => mockState.graphActions,
}));

vi.mock('@/shared/lib/ai-paths/core/utils', () => ({
  createDefaultPathConfig: mockState.createDefaultPathConfig,
}));

describe('usePathConfigHandlers', () => {
  beforeEach(() => {
    mockState.graphState.activePathId = 'path-1';
    mockState.graphState.isPathLocked = false;
    mockState.toast.mockReset();
    mockState.graphActions.setExecutionMode.mockReset();
    mockState.graphActions.setFlowIntensity.mockReset();
    mockState.graphActions.setRunMode.mockReset();
    mockState.graphActions.setPathConfigs.mockReset();
    mockState.createDefaultPathConfig.mockClear();
  });

  it('updates only scalar graph state when there is no active path', () => {
    mockState.graphState.activePathId = null;

    const { result } = renderHook(() => usePathConfigHandlers());

    act(() => {
      result.current.handleExecutionModeChange('local');
      result.current.handleFlowIntensityChange('high');
      result.current.handleRunModeChange('step');
    });

    expect(mockState.graphActions.setExecutionMode).toHaveBeenCalledWith('local');
    expect(mockState.graphActions.setFlowIntensity).toHaveBeenCalledWith('high');
    expect(mockState.graphActions.setRunMode).toHaveBeenCalledWith('step');
    expect(mockState.graphActions.setPathConfigs).not.toHaveBeenCalled();
    expect(mockState.toast).not.toHaveBeenCalled();
    expect(mockState.createDefaultPathConfig).not.toHaveBeenCalled();
  });

  it('shows lock toasts and skips updates when the active path is locked', () => {
    mockState.graphState.isPathLocked = true;

    const { result } = renderHook(() => usePathConfigHandlers());

    act(() => {
      result.current.handleExecutionModeChange('local');
      result.current.handleFlowIntensityChange('high');
      result.current.handleRunModeChange('step');
    });

    expect(mockState.toast).toHaveBeenNthCalledWith(
      1,
      'This path is locked. Unlock it to change execution mode.',
      { variant: 'info' }
    );
    expect(mockState.toast).toHaveBeenNthCalledWith(
      2,
      'This path is locked. Unlock it to change flow intensity.',
      { variant: 'info' }
    );
    expect(mockState.toast).toHaveBeenNthCalledWith(
      3,
      'This path is locked. Unlock it to change run mode.',
      { variant: 'info' }
    );
    expect(mockState.graphActions.setExecutionMode).not.toHaveBeenCalled();
    expect(mockState.graphActions.setFlowIntensity).not.toHaveBeenCalled();
    expect(mockState.graphActions.setRunMode).not.toHaveBeenCalled();
    expect(mockState.graphActions.setPathConfigs).not.toHaveBeenCalled();
    expect(mockState.createDefaultPathConfig).not.toHaveBeenCalled();
  });

  it('persists execution, intensity, and run mode changes into an existing path config', () => {
    const existingConfig = {
      id: 'path-1',
      executionMode: 'server',
      flowIntensity: 'medium',
      runMode: 'manual',
      preserved: 'keep-me',
    };
    const { result } = renderHook(() => usePathConfigHandlers());

    act(() => {
      result.current.handleExecutionModeChange('local');
      result.current.handleFlowIntensityChange('high');
      result.current.handleRunModeChange('step');
    });

    expect(mockState.graphActions.setExecutionMode).toHaveBeenCalledWith('local');
    expect(mockState.graphActions.setFlowIntensity).toHaveBeenCalledWith('high');
    expect(mockState.graphActions.setRunMode).toHaveBeenCalledWith('step');
    expect(mockState.graphActions.setPathConfigs).toHaveBeenCalledTimes(3);

    const executionUpdater = mockState.graphActions.setPathConfigs.mock.calls[0]?.[0] as (
      prev: Record<string, typeof existingConfig>
    ) => Record<string, typeof existingConfig>;
    const intensityUpdater = mockState.graphActions.setPathConfigs.mock.calls[1]?.[0] as (
      prev: Record<string, typeof existingConfig>
    ) => Record<string, typeof existingConfig>;
    const runModeUpdater = mockState.graphActions.setPathConfigs.mock.calls[2]?.[0] as (
      prev: Record<string, typeof existingConfig>
    ) => Record<string, typeof existingConfig>;

    expect(executionUpdater({ 'path-1': existingConfig })['path-1']).toEqual({
      ...existingConfig,
      executionMode: 'local',
    });
    expect(intensityUpdater({ 'path-1': existingConfig })['path-1']).toEqual({
      ...existingConfig,
      flowIntensity: 'high',
    });
    expect(runModeUpdater({ 'path-1': existingConfig })['path-1']).toEqual({
      ...existingConfig,
      runMode: 'step',
    });
    expect(mockState.createDefaultPathConfig).not.toHaveBeenCalled();
  });

  it('falls back to createDefaultPathConfig when the active path has no saved config yet', () => {
    const { result } = renderHook(() => usePathConfigHandlers());

    act(() => {
      result.current.handleExecutionModeChange('local');
      result.current.handleFlowIntensityChange('low');
      result.current.handleRunModeChange('automatic');
    });

    const executionUpdater = mockState.graphActions.setPathConfigs.mock.calls[0]?.[0] as (
      prev: Record<string, Record<string, unknown>>
    ) => Record<string, Record<string, unknown>>;
    const intensityUpdater = mockState.graphActions.setPathConfigs.mock.calls[1]?.[0] as (
      prev: Record<string, Record<string, unknown>>
    ) => Record<string, Record<string, unknown>>;
    const runModeUpdater = mockState.graphActions.setPathConfigs.mock.calls[2]?.[0] as (
      prev: Record<string, Record<string, unknown>>
    ) => Record<string, Record<string, unknown>>;

    expect(executionUpdater({})['path-1']).toEqual({
      id: 'path-1',
      executionMode: 'local',
      flowIntensity: 'medium',
      runMode: 'manual',
      marker: 'default-config',
    });
    expect(intensityUpdater({})['path-1']).toEqual({
      id: 'path-1',
      executionMode: 'server',
      flowIntensity: 'low',
      runMode: 'manual',
      marker: 'default-config',
    });
    expect(runModeUpdater({})['path-1']).toEqual({
      id: 'path-1',
      executionMode: 'server',
      flowIntensity: 'medium',
      runMode: 'automatic',
      marker: 'default-config',
    });
    expect(mockState.createDefaultPathConfig).toHaveBeenCalledTimes(3);
    expect(mockState.createDefaultPathConfig).toHaveBeenNthCalledWith(1, 'path-1');
    expect(mockState.createDefaultPathConfig).toHaveBeenNthCalledWith(2, 'path-1');
    expect(mockState.createDefaultPathConfig).toHaveBeenNthCalledWith(3, 'path-1');
  });
});
