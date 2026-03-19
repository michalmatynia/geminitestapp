import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useExecutionSettingsState } from '../useExecutionSettingsState';

const mockState = vi.hoisted(() => ({
  graphState: {
    executionMode: 'server',
    flowIntensity: 'medium',
    runMode: 'manual',
    strictFlowMode: true,
    blockedRunPolicy: 'fail_run',
    aiPathsValidation: { enabled: true, existing: 'value' },
    historyRetentionPasses: 3,
    historyRetentionOptionsMax: 10,
  },
  graphActions: {
    setExecutionMode: vi.fn(),
    setFlowIntensity: vi.fn(),
    setRunMode: vi.fn(),
    setStrictFlowMode: vi.fn(),
    setBlockedRunPolicy: vi.fn(),
    setAiPathsValidation: vi.fn(),
    setHistoryRetentionPasses: vi.fn(),
    setHistoryRetentionOptionsMax: vi.fn(),
  },
  normalizeAiPathsValidationConfig: vi.fn((value: unknown) => ({
    normalized: true,
    source: value,
  })),
}));

vi.mock('@/features/ai/ai-paths/context/GraphContext', () => ({
  useGraphState: () => mockState.graphState,
  useGraphActions: () => mockState.graphActions,
}));

vi.mock('@/shared/lib/ai-paths', () => ({
  normalizeAiPathsValidationConfig: (...args: unknown[]) =>
    mockState.normalizeAiPathsValidationConfig(...args),
}));

describe('useExecutionSettingsState', () => {
  beforeEach(() => {
    mockState.graphState = {
      executionMode: 'server',
      flowIntensity: 'medium',
      runMode: 'manual',
      strictFlowMode: true,
      blockedRunPolicy: 'fail_run',
      aiPathsValidation: { enabled: true, existing: 'value' },
      historyRetentionPasses: 3,
      historyRetentionOptionsMax: 10,
    };
    Object.values(mockState.graphActions).forEach((fn) => fn.mockReset());
    mockState.normalizeAiPathsValidationConfig.mockReset().mockImplementation((value: unknown) => ({
      normalized: true,
      source: value,
    }));
  });

  it('returns execution state values', () => {
    const { result } = renderHook(() => useExecutionSettingsState());

    expect(result.current.executionMode).toBe('server');
    expect(result.current.flowIntensity).toBe('medium');
    expect(result.current.runMode).toBe('manual');
    expect(result.current.strictFlowMode).toBe(true);
    expect(result.current.blockedRunPolicy).toBe('fail_run');
    expect(result.current.aiPathsValidationState).toEqual({ enabled: true, existing: 'value' });
    expect(result.current.historyRetentionPasses).toBe(3);
    expect(result.current.historyRetentionOptionsMax).toBe(10);
  });

  it('resolves setter updates from direct values and updater functions', () => {
    const { result } = renderHook(() => useExecutionSettingsState());

    act(() => {
      result.current.setExecutionMode((prev) => (prev === 'server' ? 'local' : 'server'));
      result.current.setFlowIntensity('high');
      result.current.setRunMode((prev) => (prev === 'manual' ? 'step' : 'manual'));
      result.current.setStrictFlowMode((prev) => !prev);
      result.current.setStrictFlowMode(0 as never);
      result.current.setBlockedRunPolicy('warn_run' as never);
      result.current.setAiPathsValidationState((prev) => ({ ...prev, enabled: false }));
      result.current.setHistoryRetentionPasses((prev) => prev + 2);
      result.current.setHistoryRetentionOptionsMax('12' as never);
    });

    expect(mockState.graphActions.setExecutionMode).toHaveBeenCalledWith('local');
    expect(mockState.graphActions.setFlowIntensity).toHaveBeenCalledWith('high');
    expect(mockState.graphActions.setRunMode).toHaveBeenCalledWith('step');
    expect(mockState.graphActions.setStrictFlowMode).toHaveBeenNthCalledWith(1, false);
    expect(mockState.graphActions.setStrictFlowMode).toHaveBeenNthCalledWith(2, false);
    expect(mockState.graphActions.setBlockedRunPolicy).toHaveBeenCalledWith('warn_run');
    expect(mockState.normalizeAiPathsValidationConfig).toHaveBeenCalledWith({
      enabled: false,
      existing: 'value',
    });
    expect(mockState.graphActions.setAiPathsValidation).toHaveBeenCalledWith({
      normalized: true,
      source: { enabled: false, existing: 'value' },
    });
    expect(mockState.graphActions.setHistoryRetentionPasses).toHaveBeenCalledWith(5);
    expect(mockState.graphActions.setHistoryRetentionOptionsMax).toHaveBeenCalledWith(12);
  });
});
